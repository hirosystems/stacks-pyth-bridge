pub fn generate_config() -> String {
    let conf = format!(
        r#"[pyth]
network = "mainnet"
price_service_url = "https://xc-mainnet.pyth.network"
price_feeds_ids = [
    "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", # BTC-USD
    "0xec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17", # STX-USD
]
# Price feeds ids available here: https://pyth.network/developers/price-feed-ids

[stacks]
network = "mainnet"
stacks_node_rpc_url = "http://localhost:20443"
pyth_oracle_contract_address = ""
mnemonic = "prevent gallery kind limb income control noise together echo rival record wedding sense uncover school version force bleak nuclear include danger skirt enact arrow"

[bridge]
price_updates_per_minute = 5
enable_rbf = true
enable_microblocks = true
"#
    );
    return conf;
}
