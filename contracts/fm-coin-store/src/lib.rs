#![no_std]

#[cfg(test)]
mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Treasury,
    PaymentToken,
    Price(PackageId),
}

#[derive(Clone, Copy, PartialEq, Eq)]
#[contracttype]
pub enum PackageId {
    Starter = 1,
    Popular = 2,
    Big = 3,
    Mega = 4,
}

impl PackageId {
    pub fn fm_amount(&self) -> u32 {
        match self {
            PackageId::Starter => 10_000,
            PackageId::Popular => 25_000,
            PackageId::Big => 60_000,
            PackageId::Mega => 150_000,
        }
    }
}

#[contract]
pub struct FmCoinStoreContract;

#[contractimpl]
impl FmCoinStoreContract {
    /// Initializes the store with the admin, treasury, and supported token.
    pub fn init(env: Env, admin: Address, treasury: Address, payment_token: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage().instance().set(&DataKey::PaymentToken, &payment_token);
    }

    /// Sets the price for a specific package. Admin only.
    pub fn set_price(env: Env, package: PackageId, price: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();
        assert!(price > 0, "Price must be positive");
        
        env.storage().instance().set(&DataKey::Price(package), &price);
    }

    /// Retrieves the price for a specific package. Returns None if unconfigured.
    pub fn get_price(env: Env, package: PackageId) -> Option<i128> {
        env.storage().instance().get(&DataKey::Price(package))
    }

    /// Purchases a package. Transfers USDC (or supported token) from buyer to treasury.
    pub fn purchase(env: Env, buyer: Address, package: PackageId) {
        buyer.require_auth();

        let treasury: Address = env.storage().instance().get(&DataKey::Treasury).expect("Store not initialized");
        let token_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).expect("Store not initialized");
        
        let price: i128 = env.storage().instance().get(&DataKey::Price(package.clone()))
            .expect("Package price not configured");

        let client = token::Client::new(&env, &token_addr);
        client.transfer(&buyer, &treasury, &price);

        let fm_amount = package.fm_amount();
        
        // Emit an event that the off-chain Express backend will listen for.
        // The backend verifies the transaction hash, caller, and this event payload before issuing off-chain FM coins.
        env.events().publish(
            (symbol_short!("purchase"), buyer.clone()),
            (package as u32, price, fm_amount),
        );
    }
}
