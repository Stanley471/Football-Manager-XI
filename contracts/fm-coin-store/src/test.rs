#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Events}, Address, Env, IntoVal};
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient as TokenAdminClient;

fn setup_test_token(env: &Env, admin: &Address) -> (Address, TokenClient, TokenAdminClient) {
    let contract_id = env.register_stellar_asset_contract(admin.clone());
    let token_client = TokenClient::new(env, &contract_id);
    let token_admin = TokenAdminClient::new(env, &contract_id);
    (contract_id, token_client, token_admin)
}

#[test]
fn test_successful_purchase() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let buyer = Address::generate(&env);
    
    // Set up a mock USDC token
    let token_admin = Address::generate(&env);
    let (token_id, token_client, token_admin_client) = setup_test_token(&env, &token_admin);
    
    // Mint 100 USDC to buyer
    token_admin_client.mint(&buyer, &100_0000000);

    let contract_id = env.register_contract(None, FmCoinStoreContract);
    let client = FmCoinStoreContractClient::new(&env, &contract_id);

    // 1. Initialize
    client.init(&admin, &treasury, &token_id);

    // 2. Configure package price (e.g. Starter = 10 USDC)
    let starter_price: i128 = 10_0000000;
    client.set_price(&PackageId::Starter, &starter_price);

    // 3. Buyer purchases the package
    client.purchase(&buyer, &PackageId::Starter);

    // 4. Verify Payment Transfer
    assert_eq!(token_client.balance(&buyer), 90_0000000);
    assert_eq!(token_client.balance(&treasury), 10_0000000);

    // 5. Verify Event was published
    let events = env.events().all();
    assert_eq!(events.len(), 1);
    
    let event = events.last().unwrap();
    // The event payload: (package as u32, price, fm_amount) -> (1u32, 10_0000000i128, 10_000u32)
    let expected_payload = (1u32, starter_price, 10_000u32).into_val(&env);
    
    assert_eq!(event.1.topics.len(), 2);
    // Topic 0: symbol_short!("purchase")
    // Topic 1: buyer
    assert_eq!(event.1.data, expected_payload);
}

#[test]
#[should_panic(expected = "Package price not configured")]
fn test_unconfigured_package_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_id = Address::generate(&env);
    
    let contract_id = env.register_contract(None, FmCoinStoreContract);
    let client = FmCoinStoreContractClient::new(&env, &contract_id);

    client.init(&admin, &treasury, &token_id);
    
    // Attempt purchase without setting price
    client.purchase(&buyer, &PackageId::Starter);
}

#[test]
#[should_panic(expected = "Price must be positive")]
fn test_invalid_pricing_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let token_id = Address::generate(&env);
    
    let contract_id = env.register_contract(None, FmCoinStoreContract);
    let client = FmCoinStoreContractClient::new(&env, &contract_id);

    client.init(&admin, &treasury, &token_id);
    
    // Try setting negative or zero price
    client.set_price(&PackageId::Starter, &0);
}
