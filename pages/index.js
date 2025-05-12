import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useBalance,
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
} from 'wagmi';
import { parseUnits } from 'viem';
import toast from 'react-hot-toast';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const parsedAmount = parseFloat(amount);
  const isValidAmount =
    !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= 500;

  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({
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
    data: txData,
    write,
    isLoading: isWriting,
  } = useContractWrite(config);

  const { isLoading: isConfirming } = useWaitForTransaction({
    hash: txData?.hash,
    onSuccess() {
      toast.success('Mint Successful');
      setAmount('');
    },
    onError() {
      toast.error('Mint Failed');
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-xl p-6 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">USDEC Testnet App</h1>
        <div className="flex justify-center mb-6">
          <ConnectButton />
        </div>
        {isConnected && (
          <div>
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
              disabled={!write || isWriting || isConfirming || !isValidAmount}
              className={`w-full p-2 rounded text-white ${
                !write || isWriting || isConfirming || !isValidAmount
                  ? 'bg-gray-400'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isWriting || isConfirming ? 'Minting...' : 'Mint USDEC'}
            </button>

            {txData?.hash && (
              <div className="mt-4 text-center">
                <a
                  href={`https://sepolia.basescan.org/tx/${txData.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View Transaction
                </a>
              </div>
            )}

            <div className="mt-6 text-center">
              <strong>USDEC Balance:</strong>{' '}
              {isBalanceLoading ? '...' : balanceData?.formatted || '0'} USDEC
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
