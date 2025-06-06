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

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [mintHistory, setMintHistory] = useState([]);

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
      const timestamp = new Date().toISOString();
      setMintHistory((prev) => [
        { tx: data.hash, amount: parsedAmount, date: timestamp },
        ...prev.slice(0, 2),
      ]);
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

  const redemptionDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toDateString();
  };

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

            <div className="mt-4">
              <strong>Your USDEC Balance:</strong> {formattedBalance}
            </div>

            <div className="mt-2 text-sm">
              <strong>Redemption Notice:</strong> Available after 30 days —
              <br />
              <span className="text-gray-800 font-semibold">{redemptionDate()}</span>
            </div>

            {mintHistory.length > 0 && (
              <div className="mt-4 text-left text-sm">
                <strong className="block mb-1">Recent Transactions:</strong>
                <ul className="list-disc list-inside text-gray-700">
                  {mintHistory.map((tx, index) => (
                    <li key={index}>
                      {tx.amount} USDC on {new Date(tx.date).toLocaleDateString()}{' '}
                      —
                      <a
                        href={`https://sepolia.basescan.org/tx/${tx.tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-1"
                      >
                        View
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Morpho Blue section */}
      <div className="mb-6 text-center">
        <a
          href="https://app.morpho.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 font-medium hover:underline"
        >
          Morpho Blue Est. APY: ~5.2%
        </a>
      </div>

      {/* Footer – The Koru Symbol */}
      <div
        className="w-full max-w-2xl mt-6 p-4 rounded-lg"
        style={{
          background: 'linear-gradient(to right, rgba(87,146,255,0.3), rgba(87,146,255,0.3))',
        }}
      >
        <h3 className="text-lg font-semibold mb-2 text-[#4B4B4B]">The Koru Symbol</h3>
        <p className="text-sm leading-relaxed text-[#4B4B4B]">
          The Koru is a spiral derived from the unfurling frond of the silver fern. It symbolizes new life, growth,
          strength and peace. This yacht, named Koru, was built in 2023 and represents a journey toward new beginnings.
          In the creator economy, we honor the same spirit — evolving with purpose and navigating the open seas of
          ownership and opportunity.
        </p>
      </div>
    </div>
  );
}
