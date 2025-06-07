import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useContractWrite,
  useContractRead,
  usePrepareContractWrite,
} from 'wagmi';
import toast from 'react-hot-toast';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0xc183cf44a134893C293228B871CfB581ebE26160';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [recentTxs, setRecentTxs] = useState([]);

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
      setRecentTxs((prev) => [data.hash, ...prev.slice(0, 2)]);
      toast.success('Minted successfully!');
    },
    onError(error) {
      toast.error(error.message || 'Transaction failed');
    },
  });

  const { data: balance } = useContractRead({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected,
    watch: true,
  });

  const formattedBalance = balance
    ? (Number(balance) / 1e6).toFixed(4)
    : '0.0000';

  return (
    <div
      className="min-h-screen bg-cover bg-center flex flex-col items-center p-4"
      style={{
        backgroundImage: "url('/koru-bg-wide.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mt-6 mb-4 bg-black bg-opacity-60 p-4 rounded-xl">
        <Image
          src="/usdec-logo-morpho.png"
          alt="USDEC + Morpho Logo"
          width={180}
          height={180}
        />
        <p className="text-sm italic text-white text-center mt-2">
          (pronounced “US Deck”)<br />
          A Stablecoin for the Creator Economy
        </p>
      </div>

      {/* Mint Form */}
      <div className="bg-white bg-opacity-90 shadow-xl rounded-2xl p-6 w-full max-w-sm text-center mb-6">
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
              className="w-full p-2 border border-gray-300 rounded mb-2"
            />

            {isValidAmount && (
              <p className="text-sm text-gray-700 mb-2 font-semibold">
                Fee: {(parsedAmount * 0.01).toFixed(2)} USDC • Vault: {(parsedAmount * 0.99).toFixed(2)} USDC
              </p>
            )}

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

            <div className="mt-4 text-sm text-gray-800">
              <strong>USDEC Balance:</strong> {formattedBalance}
            </div>

            {txHash && (
              <div className="mt-2">
                <a
                  href={`https://base-sepolia.blockscout.com/tx/${txHash}`}
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

      {/* Morpho Blue APY */}
      <div className="mb-6 text-center">
        <a
          href="https://app.morpho.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 font-semibold hover:underline"
        >
          Morpho Blue Est. APY: ~5.2%
        </a>
      </div>

      {/* Redemption Notice + Recent TXs */}
      <div className="bg-white bg-opacity-90 p-4 rounded-lg max-w-md w-full mb-6">
        <h4 className="text-sm font-semibold text-gray-700">
          🔁 30-Day Redemption Notice
        </h4>
        <p className="text-xs text-gray-700 mb-2">
          USDEC can be redeemed after 30 days from each mint. A single redeem call will return all eligible amounts.
        </p>
        {recentTxs.length > 0 && (
          <div className="text-xs text-gray-700">
            <p className="font-semibold">Recent Mints:</p>
            <ul className="list-disc list-inside">
              {recentTxs.map((hash, i) => (
                <li key={i}>
                  <a
                    href={`https://base-sepolia.blockscout.com/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {hash.slice(0, 12)}...
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Koru Footer */}
      <div
        className="w-full max-w-2xl mt-6 p-4 rounded-lg"
        style={{
          background:
            'linear-gradient(to right, rgba(87,146,255,0.25), rgba(87,146,255,0.35))',
        }}
      >
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#4B4B4B' }}>
          The Koru Symbol
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: '#4B4B4B' }}>
          The Koru is a spiral derived from the unfurling frond of the silver fern.
          It symbolizes new life, growth, strength and peace. This yacht, named Koru,
          was built in 2023 and represents a journey toward new beginnings. In the
          creator economy, we honor the same spirit — evolving with purpose and
          navigating the open seas of ownership and opportunity.
        </p>
      </div>
    </div>
  );
}
