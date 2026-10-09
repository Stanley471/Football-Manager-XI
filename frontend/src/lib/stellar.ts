import { isConnected, getAddress, signTransaction, setAllowed } from '@stellar/freighter-api';
import { rpc, TransactionBuilder, Networks, Contract, nativeToScVal } from '@stellar/stellar-sdk';

export interface WalletState {
  connected: boolean;
  address: string | null;
}

export const connectWallet = async (): Promise<WalletState> => {
  if (await isConnected()) {
    await setAllowed();
    const addressResult = await getAddress();
    return { connected: true, address: addressResult.address };
  }
  return { connected: false, address: null };
};

export const submitPurchaseTransaction = async (
  packageId: string,
  config: { network: string; rpcUrl: string; contractId: string },
  buyerAddress: string
): Promise<string> => {
  const rpcServer = new rpc.Server(config.rpcUrl, { allowHttp: true });
  const networkPassphrase = config.network === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET;
  
  // Get sequence number
  const account = await rpcServer.getAccount(buyerAddress);
  
  // Construct the contract call
  const contract = new Contract(config.contractId);
  const operation = contract.call(
    'buy_package', // Assumed method name since not provided
    nativeToScVal(buyerAddress, { type: 'address' }),
    nativeToScVal(packageId, { type: 'symbol' })
  );

  const tx = new TransactionBuilder(account, { fee: '10000', networkPassphrase })
    .addOperation(operation)
    .setTimeout(300)
    .build();

  // Prepare transaction
  const preparedTx = await rpcServer.prepareTransaction(tx);
  
  // Sign transaction
  const signedXdr = await signTransaction(preparedTx.toXDR(), { networkPassphrase });
  
  if (signedXdr.error) {
    throw new Error(signedXdr.error as string);
  }
  
  // Submit transaction
  const response = await rpcServer.sendTransaction(tx);
  
  if (response.status === 'ERROR') {
    throw new Error(`Transaction submission failed: ${response.status}`);
  }

  return response.hash;
};
