import { useState } from 'react';
import { useAccount, useContractWrite, usePrepareContractWrite, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import usdecAbi from '../usdecAbi.json';
import toast from 'react-hot-toast';

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { config } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    args: isValidAmount ? [BigInt(Math.round(parsedAmount * 1e6))] : undefined,
    enabled: isConnected && isValidAmount,
  });

  const { write, isLoading, data: txData } = useContractWrite({
    ...config,
    onSuccess() {
      toast.success('Mint Successful');
    },
    onError(error) {
      toast.error(`Mint Failed: ${error.message}`);
    },
  });

  const { data: balanceData } = useBalance({
    address,
    token: USDEC_ADDRESS,
    watch: true,
    enabled: isConnected,
  });

  return (
    <div style={{ backgroundColor: '#d6d3cd' }} className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-purple-300 text-center">
        <div className="flex flex-col items-center mb-4">
          <img
            src="/usdec-logo.png"
            alt="USDEC Logo"
            className="w-16 h-16 object-contain mb-2"
          />
          <p className="text-xs text-gray-600 italic">Pronounced: “US Deck”</p>
          <h1 className="text-xl font-bold text-purple-800 mt-1">USDEC</h1>
          <p className="text-sm text-gray-600 mt-1">A Stablecoin for the Creator Economy</p>
        </div>

        <ConnectButton />

        {isConnected && (
          <div className="mt-6">
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
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isLoading ? 'Minting...' : 'Mint USDEC'}
            </button>

            <div className="mt-4 text-sm">
              <strong className="text-gray-700">USDEC Balance:</strong>{' '}
              {balanceData ? `${balanceData.formatted} USDEC` : '...'}
            </div>

            {txData && (
              <div className="mt-2 text-sm">
                <a
                  href={`https://sepolia.basescan.org/tx/${txData.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View Transaction
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
