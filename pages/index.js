import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
  useBalance,
} from 'wagmi';
import { parseUnits } from 'viem';
import toast from 'react-hot-toast';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState(null);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { data: balanceData } = useBalance({
    address,
    token: USDEC_ADDRESS,
    watch: true,
    enabled: isConnected,
  });

  const { config } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    args: isValidAmount ? [parseUnits(amount, 6)] : undefined,
    enabled: isConnected && isValidAmount,
  });

  const {
    write,
    data: writeData,
    isLoading,
  } = useContractWrite({
    ...config,
    onSuccess: (data) => {
      setTxHash(data.hash);
    },
  });

  useWaitForTransaction({
    hash: writeData?.hash,
    onSuccess() {
      toast.success('Minted Successfully');
    },
  });

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center text-blue-800">USDEC Testnet App</h1>
        <div className="flex justify-center mb-6">
          <ConnectButton />
        </div>

        {isConnected && (
          <>
            <input
              type="number"
              placeholder="Amount (Max 500 USDC)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              className="w-full p-3 border border-gray-300 rounded mb-4 text-lg"
            />
            <button
              onClick={() => write?.()}
              disabled={!write || isLoading || !isValidAmount}
              className={`w-full p-3 rounded text-white text-lg font-semibold ${
                !write || isLoading || !isValidAmount
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Minting...' : 'Mint USDEC'}
            </button>

            <div className="mt-4 text-center">
              <strong className="block text-gray-700">USDEC Balance:</strong>
              <span className="text-xl font-mono">
                {balanceData ? `${balanceData.formatted} USDEC` : '...'}
              </span>
            </div>

            {txHash && (
              <div className="mt-3 text-center">
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline text-sm"
                >
                  View Transaction
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
