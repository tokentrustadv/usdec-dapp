import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useContractWrite,
  usePrepareContractWrite,
  useBalance,
} from 'wagmi';
import { toast } from 'react-hot-toast';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState(null);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
    token: USDEC_ADDRESS,
    watch: true,
    enabled: isConnected,
  });

  const { config } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    args: isValidAmount ? [BigInt(Math.round(parsedAmount * 1e6))] : undefined,
    enabled: isConnected && isValidAmount,
  });

  const { write, isLoading } = useContractWrite({
    ...config,
    onSuccess: (tx) => {
      toast.success('Mint Successful!');
      setTxHash(tx.hash);
      setTimeout(() => refetchBalance(), 3000);
    },
    onError: () => {
      toast.error('Mint Failed');
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">USDEC Testnet App</h1>
      <ConnectButton />
      {isConnected && (
        <div className="mt-6 w-full max-w-sm">
          <input
            type="number"
            placeholder="Amount (Max 500 USDC)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            className="w-full p-2 border border-gray-300 rounded mb-4"
          />
          <button
            onClick={() => write?.()}
            disabled={!write || isLoading || !isValidAmount}
            className={`w-full p-2 rounded text-white ${
              !write || isLoading || !isValidAmount
                ? 'bg-gray-400'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Minting...' : 'Mint USDEC'}
          </button>
          <div className="mt-4 text-center">
            <strong>USDEC Balance:</strong>{' '}
            {balanceData ? `${balanceData.formatted} USDEC` : '...'}
            {txHash && (
              <div className="mt-2 text-sm">
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View Transaction
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
