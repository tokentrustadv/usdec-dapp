import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useContractWrite, usePrepareContractWrite, useContractRead } from 'wagmi';
import { formatUnits } from 'viem';
import toast from 'react-hot-toast';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(null);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { data: balanceData } = useContractRead({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'balanceOf',
    args: [address],
    watch: true,
  });

  useEffect(() => {
    if (balanceData) {
      setBalance(Number(formatUnits(balanceData, 6)).toFixed(2));
    }
  }, [balanceData]);

  const { config } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    args: isValidAmount ? [BigInt(Math.round(parsedAmount * 1e6))] : undefined,
    enabled: isConnected && isValidAmount,
  });

  const { write, isLoading, isSuccess } = useContractWrite({
    ...config,
    onSuccess: () => {
      toast.success('Minted successfully!');
    },
    onError: () => {
      toast.error('Mint failed. Try again.');
    },
  });

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-center mb-4">USDEC Testnet App</h1>
      <ConnectButton />
      {isConnected && (
        <div className="mt-6 w-full max-w-md p-6 rounded-xl bg-gray-50 shadow space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount to Mint (Max 500)
            </label>
            <input
              type="number"
              id="amount"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <button
            onClick={() => write?.()}
            disabled={!write || isLoading || !isValidAmount}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Minting...' : 'Mint USDEC'}
          </button>
          {balance !== null && (
            <p className="text-sm text-gray-700 text-center">
              Current USDEC Balance: <strong>{balance}</strong>
            </p>
          )}
        </div>
      )}
    </main>
  );
}
