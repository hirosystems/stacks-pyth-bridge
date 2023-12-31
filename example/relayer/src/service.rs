use std::collections::HashMap;
use std::io::{Cursor, Read};
use std::sync::mpsc::channel;
use std::thread;

use chainhook_sdk::stacks_rpc_client::clarity::codec::{
    TransactionAnchorMode, TransactionContractCall, TransactionPayload,
};
use chainhook_sdk::stacks_rpc_client::clarity::vm::types::Value;
use chainhook_sdk::stacks_rpc_client::{self, StacksRpc};
use chainhook_sdk::{
    observer::{start_event_observer, ObserverEvent},
    types::{BlockIdentifier, StacksChainEvent},
    utils::Context,
};
use libsecp256k1::{recover, Message, PublicKey, RecoveryId, Signature};
use sha3::Digest;
use sha3::Keccak256;

use crate::config::{PythConfig, StacksConfig};
use crate::{
    config::Config,
    utils::{start_new_clock, ClockCommand},
};

const VAA_GUARDIANS_SET_EPOCH_1: &str = "010000000001007ac31b282c2aeeeb37f3385ee0de5f8e421d30b9e5ae8ba3d4375c1c77a86e77159bb697d9c456d6f8c02d22a94b1279b65b0d6a9957e7d3857423845ac758e300610ac1d2000000030001000000000000000000000000000000000000000000000000000000000000000400000000000005390000000000000000000000000000000000000000000000000000000000436f7265020000000000011358cc3ae5c097b213ce3c81979e1b9f9570746aa5ff6cb952589bde862c25ef4392132fb9d4a42157114de8460193bdf3a2fcf81f86a09765f4762fd1107a0086b32d7a0977926a205131d8731d39cbeb8c82b2fd82faed2711d59af0f2499d16e726f6b211b39756c042441be6d8650b69b54ebe715e234354ce5b4d348fb74b958e8966e2ec3dbd4958a7cdeb5f7389fa26941519f0863349c223b73a6ddee774a3bf913953d695260d88bc1aa25a4eee363ef0000ac0076727b35fbea2dac28fee5ccb0fea768eaf45ced136b9d9e24903464ae889f5c8a723fc14f93124b7c738843cbb89e864c862c38cddcccf95d2cc37a4dc036a8d232b48f62cdd4731412f4890da798f6896a3331f64b48c12d1d57fd9cbe7081171aa1be1d36cafe3867910f99c09e347899c19c38192b6e7387ccd768277c17dab1b7a5027c0b3cf178e21ad2e77ae06711549cfbb1f9c7a9d8096e85e1487f35515d02a92753504a8d75471b9f49edb6fbebc898f403e4773e95feb15e80c9a99c8348d";
const VAA_GUARDIANS_SET_EPOCH_2: &str = "01000000010d0012e6b39c6da90c5dfd3c228edbb78c7a4c97c488ff8a346d161a91db067e51d638c17216f368aa9bdf4836b8645a98018ca67d2fec87d769cabfdf2406bf790a0002ef42b288091a670ef3556596f4f47323717882881eaf38e03345078d07a156f312b785b64dae6e9a87e3d32872f59cb1931f728cecf511762981baf48303668f0103cef2616b84c4e511ff03329e0853f1bd7ee9ac5ba71d70a4d76108bddf94f69c2a8a84e4ee94065e8003c334e899184943634e12043d0dda78d93996da073d190104e76d166b9dac98f602107cc4b44ac82868faf00b63df7d24f177aa391e050902413b71046434e67c770b19aecdf7fce1d1435ea0be7262e3e4c18f50ddc8175c0105d9450e8216d741e0206a50f93b750a47e0a258b80eb8fed1314cc300b3d905092de25cd36d366097b7103ae2d184121329ba3aa2d7c6cc53273f11af14798110010687477c8deec89d36a23e7948feb074df95362fc8dcbd8ae910ac556a1dee1e755c56b9db5d710c940938ed79bc1895a3646523a58bc55f475a23435a373ecfdd0107fb06734864f79def4e192497362513171530daea81f07fbb9f698afe7e66c6d44db21323144f2657d4a5386a954bb94eef9f64148c33aef6e477eafa2c5c984c01088769e82216310d1827d9bd48645ec23e90de4ef8a8de99e2d351d1df318608566248d80cdc83bdcac382b3c30c670352be87f9069aab5037d0b747208eae9c650109e9796497ff9106d0d1c62e184d83716282870cef61a1ee13d6fc485b521adcce255c96f7d1bca8d8e7e7d454b65783a830bddc9d94092091a268d311ecd84c26010c468c9fb6d41026841ff9f8d7368fa309d4dbea3ea4bbd2feccf94a92cc8a20a226338a8e2126cd16f70eaf15b4fc9be2c3fa19def14e071956a605e9d1ac4162010e23fcb6bd445b7c25afb722250c1acbc061ed964ba9de1326609ae012acdfb96942b2a102a2de99ab96327859a34a2b49a767dbdb62e0a1fb26af60fe44fd496a00106bb0bac77ac68b347645f2fb1ad789ea9bd76fb9b2324f25ae06f97e65246f142df717f662e73948317182c62ce87d79c73def0dba12e5242dfc038382812cfe00126da03c5e56cb15aeeceadc1e17a45753ab4dc0ec7bf6a75ca03143ed4a294f6f61bc3f478a457833e43084ecd7c985bf2f55a55f168aac0e030fc49e845e497101626e9d9a5d9e343f00010000000000000000000000000000000000000000000000000000000000000004c1759167c43f501c2000000000000000000000000000000000000000000000000000000000436f7265020000000000021358cc3ae5c097b213ce3c81979e1b9f9570746aa5ff6cb952589bde862c25ef4392132fb9d4a42157114de8460193bdf3a2fcf81f86a09765f4762fd1107a0086b32d7a0977926a205131d8731d39cbeb8c82b2fd82faed2711d59af0f2499d16e726f6b211b39756c042441be6d8650b69b54ebe715e234354ce5b4d348fb74b958e8966e2ec3dbd4958a7cd66b9590e1c41e0b226937bf9217d1d67fd4e91f574a3bf913953d695260d88bc1aa25a4eee363ef0000ac0076727b35fbea2dac28fee5ccb0fea768eaf45ced136b9d9e24903464ae889f5c8a723fc14f93124b7c738843cbb89e864c862c38cddcccf95d2cc37a4dc036a8d232b48f62cdd4731412f4890da798f6896a3331f64b48c12d1d57fd9cbe7081171aa1be1d36cafe3867910f99c09e347899c19c38192b6e7387ccd768277c17dab1b7a5027c0b3cf178e21ad2e77ae06711549cfbb1f9c7a9d8096e85e1487f35515d02a92753504a8d75471b9f49edb6fbebc898f403e4773e95feb15e80c9a99c8348d";
const VAA_GUARDIANS_SET_EPOCH_3: &str = "01000000020d00ce45474d9e1b1e7790a2d210871e195db53a70ffd6f237cfe70e2686a32859ac43c84a332267a8ef66f59719cf91cc8df0101fd7c36aa1878d5139241660edc0010375cc906156ae530786661c0cd9aef444747bc3d8d5aa84cac6a6d2933d4e1a031cffa30383d4af8131e929d9f203f460b07309a647d6cd32ab1cc7724089392c000452305156cfc90343128f97e499311b5cae174f488ff22fbc09591991a0a73d8e6af3afb8a5968441d3ab8437836407481739e9850ad5c95e6acfcc871e951bc30105a7956eefc23e7c945a1966d5ddbe9e4be376c2f54e45e3d5da88c2f8692510c7429b1ea860ae94d929bd97e84923a18187e777aa3db419813a80deb84cc8d22b00061b2a4f3d2666608e0aa96737689e3ba5793810ff3a52ff28ad57d8efb20967735dc5537a2e43ef10f583d144c12a1606542c207f5b79af08c38656d3ac40713301086b62c8e130af3411b3c0d91b5b50dcb01ed5f293963f901fc36e7b0e50114dce203373b32eb45971cef8288e5d928d0ed51cd86e2a3006b0af6a65c396c009080009e93ab4d2c8228901a5f4525934000b2c26d1dc679a05e47fdf0ff3231d98fbc207103159ff4116df2832eea69b38275283434e6cd4a4af04d25fa7a82990b707010aa643f4cf615dfff06ffd65830f7f6cf6512dabc3690d5d9e210fdc712842dc2708b8b2c22e224c99280cd25e5e8bfb40e3d1c55b8c41774e287c1e2c352aecfc010b89c1e85faa20a30601964ccc6a79c0ae53cfd26fb10863db37783428cd91390a163346558239db3cd9d420cfe423a0df84c84399790e2e308011b4b63e6b8015010ca31dcb564ac81a053a268d8090e72097f94f366711d0c5d13815af1ec7d47e662e2d1bde22678113d15963da100b668ba26c0c325970d07114b83c5698f46097010dc9fda39c0d592d9ed92cd22b5425cc6b37430e236f02d0d1f8a2ef45a00bde26223c0a6eb363c8b25fd3bf57234a1d9364976cefb8360e755a267cbbb674b39501108db01e444ab1003dd8b6c96f8eb77958b40ba7a85fefecf32ad00b7a47c0ae7524216262495977e09c0989dd50f280c21453d3756843608eacd17f4fdfe47600001261025228ef5af837cb060bcd986fcfa84ccef75b3fa100468cfd24e7fadf99163938f3b841a33496c2706d0208faab088bd155b2e20fd74c625bb1cc8c43677a0163c53c409e0c5dfa000100000000000000000000000000000000000000000000000000000000000000046c5a054d7833d1e42000000000000000000000000000000000000000000000000000000000436f7265020000000000031358cc3ae5c097b213ce3c81979e1b9f9570746aa5ff6cb952589bde862c25ef4392132fb9d4a42157114de8460193bdf3a2fcf81f86a09765f4762fd1107a0086b32d7a0977926a205131d8731d39cbeb8c82b2fd82faed2711d59af0f2499d16e726f6b211b39756c042441be6d8650b69b54ebe715e234354ce5b4d348fb74b958e8966e2ec3dbd4958a7cd15e7caf07c4e3dc8e7c469f92c8cd88fb8005a2074a3bf913953d695260d88bc1aa25a4eee363ef0000ac0076727b35fbea2dac28fee5ccb0fea768eaf45ced136b9d9e24903464ae889f5c8a723fc14f93124b7c738843cbb89e864c862c38cddcccf95d2cc37a4dc036a8d232b48f62cdd4731412f4890da798f6896a3331f64b48c12d1d57fd9cbe7081171aa1be1d36cafe3867910f99c09e347899c19c38192b6e7387ccd768277c17dab1b7a5027c0b3cf178e21ad2e77ae06711549cfbb1f9c7a9d8096e85e1487f35515d02a92753504a8d75471b9f49edb6fbebc898f403e4773e95feb15e80c9a99c8348d";

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
    let context = if config.event_observer.display_logs {
        ctx.clone()
    } else {
        Context::empty()
    };
    let observer_cmd_tx_moved = observer_cmd_tx.clone();
    let _ = std::thread::spawn(move || {
        start_event_observer(
            event_observer_config,
            observer_cmd_tx_moved,
            observer_cmd_rx,
            Some(observer_event_tx),
            None,
            context,
        )
        .expect("unable to start Stacks chain observer");
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
            ObserverEvent::StacksChainEvent((chain_event, _report)) => {
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
                    info!(
                        ctx.expect_logger(),
                        "Stacks blockchain updated with block #{}", new_block_identifier.index
                    );
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
    let _price_feeds = fetch_pyth_price_feeds(&config.pyth, &ctx).await?;

    // for (price_feed_id, price_feed) in price_feeds.iter() {
    //     info!(ctx.expect_logger(), "{}: {:?}", price_feed_id, price_feed);
    // }

    info!(ctx.expect_logger(), "Epoch 1");
    let vaa_bytes = hex::decode(VAA_GUARDIANS_SET_EPOCH_1).unwrap();
    let public_keys_epoch_1 = compute_secp256k1_recovery_from_vaa(&vaa_bytes, &ctx).unwrap();
    for (guardian_id, public_key) in public_keys_epoch_1.iter() {
        let public_key_bytes = public_key.serialize()[1..].to_vec();
        let eth_address = {
            let public_key_hash: [u8; 32] =
                Keccak256::digest(&public_key_bytes).try_into().unwrap();
            public_key_hash[12..32].to_vec()
        };
        info!(
            ctx.expect_logger(),
            "{}:\t0x{} ({})",
            guardian_id,
            hex::encode(&eth_address),
            hex::encode(&public_key_bytes)
        );
    }

    info!(ctx.expect_logger(), "Epoch 2");
    let vaa_bytes = hex::decode(VAA_GUARDIANS_SET_EPOCH_2).unwrap();
    let public_keys_epoch_2 = compute_secp256k1_recovery_from_vaa(&vaa_bytes, &ctx).unwrap();
    for (guardian_id, public_key) in public_keys_epoch_2.iter() {
        let public_key_bytes = public_key.serialize()[1..].to_vec();
        let eth_address = {
            let public_key_hash: [u8; 32] =
                Keccak256::digest(&public_key_bytes).try_into().unwrap();
            public_key_hash[12..32].to_vec()
        };
        info!(
            ctx.expect_logger(),
            "{}:\t0x{} ({})",
            guardian_id,
            hex::encode(&eth_address),
            hex::encode(&public_key_bytes)
        );
    }

    info!(ctx.expect_logger(), "Epoch 3");
    let vaa_bytes = hex::decode(VAA_GUARDIANS_SET_EPOCH_3).unwrap();
    let public_keys_epoch_3 = compute_secp256k1_recovery_from_vaa(&vaa_bytes, &ctx).unwrap();
    for (guardian_id, public_key) in public_keys_epoch_3.iter() {
        let public_key_bytes = public_key.serialize()[1..].to_vec();
        let eth_address = {
            let public_key_hash: [u8; 32] =
                Keccak256::digest(&public_key_bytes).try_into().unwrap();
            public_key_hash[12..32].to_vec()
        };
        info!(
            ctx.expect_logger(),
            "{}:\t0x{}",
            guardian_id,
            hex::encode(&eth_address)
        );
    }

    Ok(())
}

pub async fn collect_guardians_public_keys(config: &Config, ctx: &Context) {
    info!(
        ctx.expect_logger(),
        "Collecting VAAs and computing guardians public keys"
    );

    let mut public_keys = HashMap::new();
    loop {
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
        for (_, vaa) in vaas.iter() {
            let new_public_keys = compute_secp256k1_recovery_from_vaa(vaa, ctx).unwrap();
            for (guardian_id, public_key) in new_public_keys.into_iter() {
                match public_keys.get(&guardian_id) {
                    None => {
                        let key = public_key.serialize();
                        info!(
                            ctx.expect_logger(),
                            "Found new public key: {}\t{}",
                            guardian_id,
                            hex::encode(&key)
                        );
                        public_keys.insert(guardian_id, public_key.serialize());
                    }
                    Some(_) => {}
                }
            }
        }
        if public_keys.len() == 19 {
            break;
        }
        thread::sleep(std::time::Duration::from_secs(1));
    }
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
        "Listening for Stacks blockchain events on port {}", config.event_observer.ingestion_port
    );

    let mut rbf_tracking = HashMap::new();
    let rbf_enabled = false;
    let mut price_updated = false;
    let mut clock_stop: Option<crossbeam_channel::Sender<ClockCommand>> = None;
    loop {
        let event = match tenure_cmd_rx.recv() {
            Ok(event) => event,
            Err(e) => {
                // display error
                error!(
                    ctx.expect_logger(),
                    "Tenure aborted: {}", e.to_string()
                );            
                break;
            }
        };

        match event {
            BridgeTenureCommand::StartPriceFeedBlockUpdates(_block) => {
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
                price_updated = false;
            }
            BridgeTenureCommand::PriceFeedBlockUpdatesTick => {
                if price_updated && !rbf_enabled {
                    continue;
                }
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
                if submit_stacks_transaction(&config.stacks, vaas, &mut rbf_tracking, &ctx).await.is_ok() {
                    price_updated = true;
                }
            }
            BridgeTenureCommand::PerformPriceFeedMicroblockUpdate(_microblock) => {}
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
    info!(
        ctx.expect_logger(),
        "Fetching prices feeds {}", price_feed_ids.join(", ")
    );

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
            .map_err(|e| format!("unable to decode price feed: {}", e.to_string()))?;
        debug!(
            ctx.expect_logger(),
            "{} price feed retrieved {}",
            price_feed_id,
            hex::encode(&vaa)
        );
        vaas.push((price_feed_id.clone(), vaa));
    }

    Ok(vaas)
}

pub async fn submit_stacks_transaction(
    stacks_config: &StacksConfig,
    vaas: Vec<(String, Vec<u8>)>,
    rbf_tracking: &mut HashMap<u64, u64>,
    ctx: &Context,
) -> Result<Vec<u8>, String> {
    let encoded_vaas = vaas
        .iter()
        .map(|(_, vaa)| Value::buff_from(vaa.to_vec()))
        .collect::<Result<Vec<Value>, _>>()
        .map_err(|e| format!("{}", e.to_string()))?;

    let encoded_vaas_list =
        Value::list_from(encoded_vaas).map_err(|e| format!("{}", e.to_string()))?;

    let stacks_rpc = StacksRpc::new(&stacks_config.stacks_node_rpc_url);
    let address = stacks_config.wallet.compute_stacks_address();
    let nonce = stacks_rpc
        .get_nonce(&address.to_string())
        .expect("Unable to retrieve nonce");

    let transaction_payload = TransactionPayload::ContractCall(TransactionContractCall {
        contract_name: stacks_config.pyth_oracle_contract_address.name.clone(),
        address: stacks_config
            .pyth_oracle_contract_address
            .issuer
            .clone()
            .into(),
        function_name: "update-prices-feeds".into(),
        function_args: vec![encoded_vaas_list],
    });

    let tx_fee = match rbf_tracking.get(&nonce) {
        Some(submitted_tx_fee) => submitted_tx_fee + 10,
        None => {
            // Assuming we moved on to the next transaction
            rbf_tracking.clear();

            match stacks_rpc.estimate_transaction_fee(
                &transaction_payload,
                1, /* low = 0, medium = 1, high = 2 */
            ) {
                Ok(fee) => fee,
                Err(_e) => {
                    10_000 // default fee value
                }
            }
        }
    };

    let transaction = stacks_rpc_client::crypto::sign_transaction_payload(
        &stacks_config.wallet,
        transaction_payload,
        nonce,
        tx_fee,
        TransactionAnchorMode::OnChainOnly,
    )?;

    match stacks_rpc.post_transaction(&transaction) {
        Ok(res) => {
            info!(
                ctx.expect_logger(),
                "Price feed update transaction submitted ({})", res.txid
            );
        }
        Err(e) => {
            warn!(
                ctx.expect_logger(),
                "Unable to submit price feed update: {}",
                e.to_string()
            );
        }
    };

    Ok(vec![])
}

pub fn compute_secp256k1_recovery_from_vaa(
    vaa: &Vec<u8>,
    ctx: &Context,
) -> Result<Vec<(u8, PublicKey)>, String> {
    let mut cursor = Cursor::new(&vaa);
    // Version
    let mut version = [0u8; 1];
    let _ = cursor.read(&mut version);
    // Magic bytes
    let mut magic = [0u8; 4];
    let _ = cursor.read(&mut magic);
    // Signatures len
    let mut sig_len_bytes = [0u8; 1];
    let _ = cursor.read(&mut sig_len_bytes);
    let sig_len = u8::from_be(sig_len_bytes[0]);
    let mut sigs = vec![];
    // Signatures
    for _i in 0..sig_len {
        let mut guardian_id_bytes = [0u8; 1];
        let _ = cursor.read(&mut guardian_id_bytes);
        let guardian_id = u8::from_be(guardian_id_bytes[0]);

        let mut signature = [0u8; 64];
        let _ = cursor.read(&mut signature);

        debug!(
            ctx.expect_logger(),
            "{}:\t{}",
            guardian_id,
            hex::encode(&signature)
        );
        let mut recovery_id = [0u8; 1];
        let _ = cursor.read(&mut recovery_id);

        sigs.push((guardian_id, signature, recovery_id));
    }
    // Payload
    let mut payload = vec![];
    let _ = cursor.read_to_end(&mut payload);
    // Compute Keccak256 on payload

    let payload_hash: [u8; 32] = {
        let pass_1: [u8; 32] = Keccak256::digest(payload).try_into().unwrap();
        Keccak256::digest(pass_1).try_into().unwrap()
    };

    let message = Message::parse(&payload_hash);
    let mut public_keys = vec![];
    for (guardian_id, signature_bytes, recovery_id_byte) in sigs.into_iter() {
        let signature = Signature::parse_standard(&signature_bytes).expect("invalid signature");
        let recovery_id = RecoveryId::parse(recovery_id_byte[0]).expect("invalid recovery id");
        let public_key =
            recover(&message, &signature, &recovery_id).expect("unable to recover public key");
        public_keys.push((guardian_id, public_key));
    }

    Ok(public_keys)
}
