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

  const { data: totalSupply } = useContractRead({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'totalSupply',
    watch: true,
  });

  const formattedBalance = balance
    ? (Number(balance) / 1e6).toFixed(4)
    : '0.0000';

  const formattedSupply = totalSupply
    ? (Number(totalSupply) / 1e6).toFixed(2)
    : '0.00';

  const redemptionStart = new Date('2025-06-05');
  const redemptionEnd = new Date(redemptionStart);
  redemptionEnd.setDate(redemptionStart.getDate() + 30);
  const redemptionDate = redemptionEnd.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="min-h-screen bg-cover bg-center flex flex-col items-center p-4"
      style={{
        backgroundImage: "url('/koru-bg-wide.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'Helvetica Neue', 'FK Grotesk', sans-serif",
      }}
    >
      <div className="flex flex-col items-center mt-6 mb-4 bg-black bg-opacity-60 p-4 rounded-xl">
        <Image
          src="/usdec-brandtrans.png"
          alt="USDEC Logo"
          width={160}
          height={160}
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
              <p className="text-sm text-gray-600 mb-2">
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
              <strong>Your Balance:</strong> {formattedBalance}
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

      <div className="bg-white bg-opacity-90 rounded-xl p-4 w-full max-w-md mb-6 text-sm text-center">
        <p><strong>Total USDEC Minted:</strong> {formattedSupply}</p>
        <p><strong>Redemption Available:</strong> {redemptionDate}</p>
        {recentTxs.length > 0 && (
          <div className="mt-3">
            <p className="font-semibold">Recent Transactions:</p>
            {recentTxs.map((tx, idx) => (
              <div key={idx}>
                <a
                  href={`https://sepolia.basescan.org/tx/${tx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {tx.slice(0, 10)}...
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="w-full py-6 mt-4"
        style={{
          background: 'linear-gradient(to bottom, rgba(87, 146, 255, 0.05), rgba(87, 146, 255, 0.25))',
        }}
      >
        <div className="flex flex-col items-center text-white">
          <Image
            src="/morpho-logo.svg"
            alt="Morpho Logo"
            width={120}
            height={32}
            className="mb-2"
          />
          <a
            href="https://app.morpho.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-200 hover:underline mb-4"
          >
            Morpho Blue
          </a>
          <p className="text-sm px-6 text-white text-center max-w-3xl leading-relaxed">
            <strong>The Koru Symbol</strong><br />
            Koru, the name of Jeff Bezos' yacht, is inspired by the Māori symbol representing new beginnings, growth, and the perpetual loop of renewal. It reflects the purpose of this vault — an evolving opportunity for creators and backers to Own the Economy in new ways. USDEC is not just a token — it's an invitation.
          </p>
        </div>
      </div>
    </div>
  );
}
