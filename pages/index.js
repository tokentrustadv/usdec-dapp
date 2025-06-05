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

  const redemptionDate = () => {
    const now = new Date();
    now.setDate(now.getDate() + 30);
    return now.toLocaleDateString();
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex flex-col items-center p-4"
      style={{
        backgroundImage: "url('/koru-bg-wide.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'Helvetica Neue', FK Grotesk, sans-serif",
      }}
    >
      <div className="flex flex-col items-center mt-6 mb-4 bg-black bg-opacity-60 p-4 rounded-xl">
        <Image
          src="/usdec-brandtrans.png"
          alt="USDEC Logo"
          width={160}
          height={160}
        />
        <Image
          src="/morpho-logo.svg"
          alt="Morpho Logo"
          width={120}
          height={60}
          className="mt-3"
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
              <p className="text-sm text-gray-600 mb-2 font-bold">
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
              <strong>USDEC Balance:</strong> {formattedBalance}
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

            <div className="mt-4 text-sm text-gray-800">
              <strong>Redemption Available:</strong> {redemptionDate()}
            </div>

            <div className="mt-4 text-sm text-gray-800">
              <strong>Recent Mints:</strong>
              <ul className="list-disc list-inside mt-2 text-left">
                {recentTxs.length === 0 && <li>No recent mints</li>}
                {recentTxs.map((tx, index) => (
                  <li key={index}>
                    <a
                      href={`https://sepolia.basescan.org/tx/${tx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Tx #{index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl mt-6 p-4 rounded-xl text-white text-sm"
        style={{
          background: 'linear-gradient(to right, rgba(87, 146, 255, 0.25), rgba(87, 146, 255, 0.25))',
        }}
      >
        <div className="flex flex-col items-center">
          <a
            href="https://app.morpho.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-semibold hover:underline mb-2"
          >
            Morpho Blue
          </a>
          <h2 className="text-lg font-semibold mt-4 mb-2">The Koru Symbol</h2>
          <p className="text-white text-center max-w-xl">
            Koru is the Māori word for "loop" and is based on the spiral shape
            of a new unfurling silver fern frond. The symbol conveys the idea of
            new life, growth, strength and peace. The yacht “Koru” was built by
            Oceanco and delivered in 2023. It represents not only renewal, but
            the elegant evolution of design — values mirrored in the foundation
            of USDEC and its focus on creators.
          </p>
        </div>
      </div>
    </div>
  );
}
