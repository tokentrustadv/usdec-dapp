import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useContractWrite,
  usePrepareContractWrite,
} from 'wagmi';
import { readContract } from '@wagmi/core';
import toast from 'react-hot-toast';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [balance, setBalance] = useState(null);

  const parsedAmount = parseFloat(amount);
  const isValidAmount =
    !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= 500;

  const { config } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    args: isValidAmount ? [BigInt(Math.round(parsedAmount * 1e6))] : undefined,
    enabled: isConnected && isValidAmount,
  });

  const { write, isLoading } = useContractWrite({
    ...config,
    onSuccess(data) {
      setTxHash(data.hash);
      toast.success('Minted successfully!');
      fetchBalance(); // refresh balance after mint
    },
    onError(error) {
      toast.error(error.message || 'Transaction failed');
    },
  });

  async function fetchBalance() {
    if (isConnected && address) {
      try {
        const raw = await readContract({
          address: USDEC_ADDRESS,
          abi: usdecAbi,
          functionName: 'balanceOf',
          args: [address],
        });
        const formatted = Number(raw) / 1e18;
        setBalance(formatted.toFixed(2));
      } catch (error) {
        console.error('Error reading balance:', error);
      }
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchBalance();
    }
  }, [isConnected, address]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4" style={{ backgroundColor: '#d6d3cd' }}>
      <div className="flex flex-col items-center mb-6">
        <Image
          src="/usdec-logo.png"
          alt="USDEC Logo"
          width={120}
          height={120}
        />
        <h1 className="text-2xl font-bold mt-2">USDEC (pronounced “US Deck”)</h1>
        <p className="text-sm italic text-gray-600">
          A Stablecoin for the Creator Economy
        </p>
      </div>

      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-sm text-center">
        <ConnectButton />
        {isConnected && (
          <div className="mt-4">
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

            <div className="mt-4">
              <strong>USDEC Balance:</strong>{' '}
              {balance !== null ? `${balance} USDEC` : 'Loading...'}
            </div>

            {txHash && (
              <div className="mt-2">
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
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
