use chainhook_sdk::observer::EventObserverConfigOverrides;

#[derive(Deserialize, Debug, Clone)]
pub struct ConfigFile {
    pub pyth: PythConfigFile,
    pub stacks: StacksConfigFile,
    pub bridge: BridgeConfigFile,
    pub event_observer: Option<EventObserverConfigOverrides>,
}

#[derive(Clone, Debug)]
pub enum PythNetwork {
    Devnet,
    Testnet,
    Mainnet,
}

#[derive(Deserialize, Debug, Clone)]
pub struct PythConfigFile {
    pub network: String,
    pub price_service_url: String,
    pub price_feeds_ids: Vec<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct StacksConfigFile {
    pub network: String,
    pub stacks_node_rpc_url: String,
    pub pyth_oracle_contract_address: String,
    pub mnemonic: String,
    pub derivation_path: String,
    pub start_block: u64,
}

#[derive(Deserialize, Debug, Clone)]
pub struct BridgeConfigFile {
    pub price_updates_per_minute: u64,
    pub enable_microblocks: Option<bool>,
    pub enable_rbf: bool,
}
