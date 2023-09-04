pub mod file;
pub mod generator;

use chainhook_sdk::observer::EventObserverConfig;
use chainhook_sdk::stacks_rpc_client::clarity::vm::types::QualifiedContractIdentifier;
use chainhook_sdk::stacks_rpc_client::crypto::Wallet;
use chainhook_sdk::types::StacksNetwork;

use file::ConfigFile;
use std::fs::File;
use std::io::{BufReader, Read};

#[derive(Clone, Debug)]
pub struct Config {
    pub pyth: PythConfig,
    pub stacks: StacksConfig,
    pub bridge: BridgeConfig,
    pub event_observer: EventObserverConfig,
}

#[derive(Clone, Debug)]
pub enum PythNetwork {
    Testnet,
    Mainnet,
}

#[derive(Clone, Debug)]
pub struct PythConfig {
    pub network: PythNetwork,
    pub price_service_url: String,
    pub price_feeds_ids: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct StacksConfig {
    pub network: StacksNetwork,
    pub stacks_node_rpc_url: String,
    pub pyth_oracle_contract_address: QualifiedContractIdentifier,
    pub wallet: Wallet,
    pub start_block: u64,
}

#[derive(Clone, Debug)]
pub struct BridgeConfig {
    pub price_updates_per_minute: u64,
    pub enable_microblocks: bool,
    pub enable_rbf: bool,
}

impl Config {
    pub fn from_file_path(file_path: &str) -> Result<Config, String> {
        let file = File::open(file_path)
            .map_err(|e| format!("unable to read file {}\n{:?}", file_path, e))?;
        let mut file_reader = BufReader::new(file);
        let mut file_buffer = vec![];
        file_reader
            .read_to_end(&mut file_buffer)
            .map_err(|e| format!("unable to read file {}\n{:?}", file_path, e))?;

        let config_file: ConfigFile = match toml::from_slice(&file_buffer) {
            Ok(s) => s,
            Err(e) => {
                return Err(format!("Config file malformatted {}", e.to_string()));
            }
        };
        Config::from_config_file(config_file)
    }

    pub fn from_config_file(config_file: ConfigFile) -> Result<Config, String> {
        let pyth_network = match config_file.pyth.network.as_str() {
            "testnet" => PythNetwork::Testnet,
            "mainnet" => PythNetwork::Mainnet,
            _ => return Err("network.mode not supported".to_string()),
        };

        let stacks_network = StacksNetwork::from_str(&config_file.stacks.network)?;

        let event_observer =
            EventObserverConfig::new_using_overrides(config_file.event_observer.as_ref())?;

        let wallet = Wallet {
            mnemonic: config_file.stacks.mnemonic.clone(),
            derivation: config_file.stacks.derivation_path,
            mainnet: stacks_network.is_mainnet(),
        };
        let pyth_oracle_contract_address =
            QualifiedContractIdentifier::parse(&config_file.stacks.pyth_oracle_contract_address)
                .map_err(|_e| format!("unable to parse pyth_oracle_contract_address"))?;

        let config = Config {
            pyth: PythConfig {
                network: pyth_network,
                price_service_url: config_file.pyth.price_service_url.clone(),
                price_feeds_ids: config_file.pyth.price_feeds_ids.clone(),
            },
            stacks: StacksConfig {
                stacks_node_rpc_url: config_file.stacks.stacks_node_rpc_url.to_string(),
                wallet,
                pyth_oracle_contract_address,
                network: stacks_network,
                start_block: config_file.stacks.start_block,
            },
            bridge: BridgeConfig {
                price_updates_per_minute: config_file.bridge.price_updates_per_minute,
                enable_microblocks: config_file.bridge.enable_microblocks.unwrap_or(false),
                enable_rbf: config_file.bridge.enable_rbf,
            },
            event_observer,
        };
        Ok(config)
    }
}
