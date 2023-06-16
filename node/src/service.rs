use std::sync::mpsc::channel;

use chainhook_sdk::stacks_rpc_client::clarity::codec::TransactionAnchorMode;
use chainhook_sdk::stacks_rpc_client::clarity::vm::types::{
    Value,
};
use chainhook_sdk::stacks_rpc_client::{StacksRpc, self};
use chainhook_sdk::{
    chainhook_types::{BlockIdentifier, StacksChainEvent},
    observer::{start_event_observer, ObserverEvent},
    utils::Context,
};


use crate::config::{PythConfig, StacksConfig};
use crate::{
    config::Config,
    utils::{start_new_clock, ClockCommand},
};

pub enum BridgeTenureCommand {
    StartPriceFeedBlockUpdates(BlockIdentifier),
    PriceFeedBlockUpdatesTick,
    PerformPriceFeedMicroblockUpdate(BlockIdentifier),
    StopPriceFeedBlockUpdates,
}

pub fn start_bridge_service(config: &Config, ctx: &Context) -> Result<(), String> {
    let (tenure_cmd_tx, tenure_cmd_rx) = crossbeam_channel::unbounded();
    let (observer_cmd_tx, observer_cmd_rx) = channel();
    let (observer_event_tx, observer_event_rx) = crossbeam_channel::unbounded();

    // let (ordinal_indexer_cmd_tx, ordinal_indexer_cmd_rx) = channel();

    // Start chainhook event observer
    let event_observer_config = config.event_observer.clone();
    let context_logs_disabled = Context::empty();
    let observer_cmd_tx_moved = observer_cmd_tx.clone();
    let _ = std::thread::spawn(move || {
        let future = start_event_observer(
            event_observer_config,
            observer_cmd_tx_moved,
            observer_cmd_rx,
            Some(observer_event_tx),
            context_logs_disabled,
        );
        let _ = hiro_system_kit::nestable_block_on(future);
    });

    let context_cloned = ctx.clone();
    let config_cloned = config.clone();
    let tenure_cmd_tx_cloned = tenure_cmd_tx.clone();
    let _ = std::thread::spawn(move || {
        let future = start_bridge_runloop(
            &config_cloned,
            tenure_cmd_tx_cloned,
            tenure_cmd_rx,
            &context_cloned,
        );
        let _ = hiro_system_kit::nestable_block_on(future);
    });

    loop {
        let event = match observer_event_rx.recv() {
            Ok(cmd) => cmd,
            Err(e) => {
                error!(
                    ctx.expect_logger(),
                    "Error: broken channel {}",
                    e.to_string()
                );
                break;
            }
        };

        match event {
            ObserverEvent::StacksChainEvent((chain_event, report)) => {
                // Retrieve latest block identifier known.
                // Check if microblocks are being assembled and broadcasted
                let new_block_identifier = match chain_event.get_latest_block_identifier() {
                    None => {
                        // Log warning - unexepected
                        continue;
                    }
                    Some(entry) => entry,
                };
                if new_block_identifier.index < config.stacks.start_block {
                    continue;
                }
                let (_reorg, microblocks_in_progress) = match chain_event {
                    StacksChainEvent::ChainUpdatedWithBlocks(_) => (false, false),
                    StacksChainEvent::ChainUpdatedWithReorg(_) => (true, false),
                    StacksChainEvent::ChainUpdatedWithMicroblocks(_) => (false, true),
                    StacksChainEvent::ChainUpdatedWithMicroblocksReorg(_) => (true, true),
                };

                if microblocks_in_progress {
                    // Submit microblock anchored transaction
                    let _ =
                        tenure_cmd_tx.send(BridgeTenureCommand::PerformPriceFeedMicroblockUpdate(
                            new_block_identifier.clone(),
                        ));
                } else {
                    // Submit RBF transaction if new
                    let _ = tenure_cmd_tx.send(BridgeTenureCommand::StartPriceFeedBlockUpdates(
                        new_block_identifier.clone(),
                    ));
                }
            }
            ObserverEvent::Terminate => {
                let _ = tenure_cmd_tx.send(BridgeTenureCommand::StopPriceFeedBlockUpdates);
            }
            _ => {}
        }
    }
    Ok(())
}

pub async fn ping_bridge_service(config: &Config, ctx: &Context) -> Result<(), String> {
    // Test the price feeds
    let price_feeds = fetch_pyth_price_feeds(&config.pyth, &ctx).await?;

    for (price_feed_id, price_feed) in price_feeds.iter() {
        info!(ctx.expect_logger(), "{}: {:?}", price_feed_id, price_feed);
    }
    Ok(())
}

pub async fn start_bridge_runloop(
    config: &Config,
    tenure_cmd_tx: crossbeam_channel::Sender<BridgeTenureCommand>,
    tenure_cmd_rx: crossbeam_channel::Receiver<BridgeTenureCommand>,
    ctx: &Context,
) {
    info!(ctx.expect_logger(), "Starting service...");
    info!(
        ctx.expect_logger(),
        "Listening for Stacks events on port {}", config.event_observer.ingestion_port
    );

    let mut clock_stop: Option<crossbeam_channel::Sender<ClockCommand>> = None;
    loop {
        let event = match tenure_cmd_rx.recv() {
            Ok(event) => event,
            Err(e) => {
                // display error
                break;
            }
        };

        match event {
            BridgeTenureCommand::StartPriceFeedBlockUpdates(block) => {
                // Stop previous clock
                if let Some(previous_clock) = clock_stop {
                    let _ = previous_clock.send(ClockCommand::Terminate);
                }
                // Start new clock
                let new_clock = start_new_clock(
                    config.bridge.price_updates_per_minute,
                    tenure_cmd_tx.clone(),
                    &ctx,
                );
                clock_stop = Some(new_clock);
            }
            BridgeTenureCommand::PriceFeedBlockUpdatesTick => {
                // Fetch Pyth Price Feeds
                let vaas = match fetch_pyth_price_feeds(&config.pyth, &ctx).await {
                    Ok(vaas) => vaas,
                    Err(e) => {
                        error!(
                            ctx.expect_logger(),
                            "unable to fetch price feed: {}",
                            e.to_string()
                        );
                        continue;
                    }
                };

                // Submit Stacks transactions
                let _ = submit_stacks_transaction(&config.stacks, vaas).await;
            }
            BridgeTenureCommand::PerformPriceFeedMicroblockUpdate(microblock) => {}
            BridgeTenureCommand::StopPriceFeedBlockUpdates => {
                // Termination
                break;
            }
        }
    }
}

pub async fn fetch_pyth_price_feeds(
    pyth_config: &PythConfig,
    ctx: &Context,
) -> Result<Vec<(String, Vec<u8>)>, String> {
    use base64::{engine::general_purpose, Engine as _};

    let price_feed_ids = pyth_config
        .price_feeds_ids
        .iter()
        .map(|f| format!("ids[]={}", f))
        .collect::<Vec<_>>();
    let response = reqwest::get(format!(
        "{}/api/latest_vaas?{}",
        pyth_config.price_service_url,
        price_feed_ids.join("&")
    ))
    .await
    .map_err(|e| format!("{}", e.to_string()))?
    .json::<Vec<String>>()
    .await
    .map_err(|e| format!("{}", e.to_string()))?;

    let mut vaas = vec![];
    for (price_feed, price_feed_id) in response.into_iter().zip(&pyth_config.price_feeds_ids) {
        let vaa = general_purpose::STANDARD
            .decode(price_feed)
            .map_err(|e| format!("unable to decode price feed"))?;
        info!(
            ctx.expect_logger(),
            "{} price feed retrieved {}", price_feed_id, hex::encode(&vaa)
        );
        vaas.push((price_feed_id.clone(), vaa));
    }

    Ok(vaas)
}

pub async fn submit_stacks_transaction(
    stacks_config: &StacksConfig,
    vaas: Vec<(String, Vec<u8>)>,
) -> Result<Vec<u8>, String> {
    // use chainhook_sdk::clarity::vm::types::Value;

    let encoded_vaas = vaas.iter().map(|(_, vaa)| Value::buff_from(vaa.to_vec())).collect::<Result<Vec<Value>, _>>()
        .map_err(|e| format!("{}", e.to_string()))?;

    let encoded_vaas_list = Value::list_from(encoded_vaas)
        .map_err(|e| format!("{}", e.to_string()))?;

    let transaction = stacks_rpc_client::crypto::encode_contract_call(
        &stacks_config.pyth_oracle_contract_address,
        "update-prices".into(),
        vec![encoded_vaas_list],
        &stacks_config.wallet,
        0,
        0,
        TransactionAnchorMode::OnChainOnly,
    )?;

    // let mut function_args = vec![];
    // for value in tx.parameters.iter() {
    //     let execution = match session.eval(value.to_string(), None, false) {
    //         Ok(res) => res,
    //         Err(_e) => {
    //             let _ = deployment_event_tx.send(DeploymentEvent::Interrupted(
    //                 format!(
    //                 "unable to process contract-call {}::{}: argument {} invalid",
    //                 tx.contract_id, tx.method, value
    //             ),
    //             ));
    //             return;
    //         }
    //     };
    //     match execution.result {
    //         EvaluationResult::Snippet(result) => function_args.push(result.result),
    //         _ => unreachable!("Contract result from snippet"),
    //     };
    // }

    // let anchor_mode = match tx.anchor_block_only {
    //     true => TransactionAnchorMode::OnChainOnly,
    //     false => TransactionAnchorMode::Any,
    // };

    // let transaction = match encode_contract_call(
    //     &tx.contract_id,
    //     tx.method.clone(),
    //     function_args,
    //     *account,
    //     nonce,
    //     tx.cost,
    //     anchor_mode,
    //     &network,
    // ) {
    //     Ok(res) => res,
    //     Err(e) => {
    //         let _ =
    //             deployment_event_tx.send(DeploymentEvent::Interrupted(format!(
    //                 "unable to encode contract_call {}::{} ({})",
    //                 tx.contract_id.to_string(),
    //                 tx.method,
    //                 e
    //             )));
    //         return;
    //     }
    // };

    // let function_args = tx
    //     .parameters
    //     .iter()
    //     .map(|value| {
    //         let execution = session.eval(value.to_string(), None, false).unwrap();
    //         match execution.result {
    //             EvaluationResult::Snippet(result) => result.result,
    //             _ => unreachable!("Contract result from snippet"),
    //         }
    //     })
    //     .collect::<Vec<_>>();

    // let transaction_payload =
    //     TransactionPayload::ContractCall(TransactionContractCall {
    //         contract_name: tx.contract_id.name.clone(),
    //         address: StacksAddress::from(tx.contract_id.issuer.clone()),
    //         function_name: tx.method.clone(),
    //         function_args: function_args,
    //     });

    // match stacks_rpc.estimate_transaction_fee(&transaction_payload, priority) {
    //     Ok(fee) => {
    //         tx.cost = fee;
    //     }
    //     Err(e) => {
    //         println!("unable to estimate fee for transaction: {}", e.to_string());
    //         continue;
    //     }
    // };

    // let stacks_rpc = StacksRpc::new(&stacks_node_url);
    // stacks_rpc.
    Ok(vec![])
}
