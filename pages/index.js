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
      toast.success('Minted successfully!');
      setRecentTxs((prev) => [data.hash, ...prev.slice(0, 2)]);
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

  const redemptionDate = new Date();
  redemptionDate.setDate(redemptionDate.getDate() + 30);

  return (
    <div
      className="min-h-screen bg-cover bg-center flex flex-col items-center p-4 text-white"
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
        <div className="self-start mt-2">
          <Image
            src="/morpho-logo.svg"
            alt="Morpho Logo"
            width={80}
            height={20}
          />
        </div>
        <p className="text-sm italic text-white text-center mt-2">
          (pronounced “US Deck”)<br />
          A Stablecoin for the Creator Economy
        </p>
      </div>

      <div className="bg-white bg-opacity-90 shadow-xl rounded-2xl p-6 w-full max-w-sm text-center mb-6 text-black">
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
              <p className="text-sm text-gray-800 mb-2 font-bold">
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

            <div className="mt-4 font-semibold">
              <div>USDEC Balance: {formattedBalance}</div>
              {txHash && (
                <div className="mt-2 text-sm">
                  <a
                    href={`https://sepolia.basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Mint Transaction
                  </a>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-800">
              Redemption Available:{' '}
              <span className="font-bold">
                {redemptionDate.toLocaleDateString()}
              </span>
            </div>

            {recentTxs.length > 0 && (
              <div className="mt-4 text-sm text-gray-800">
                <strong>Recent Mints:</strong>
                <ul className="list-disc list-inside text-left mt-1">
                  {recentTxs.map((hash, i) => (
                    <li key={i}>
                      <a
                        href={`https://sepolia.basescan.org/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {hash.slice(0, 12)}...
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex justify-center items-center space-x-4">
              <a
                href="https://app.morpho.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 font-semibold hover:underline"
              >
                Morpho Blue
              </a>
              <span className="text-sm text-gray-700">Est. APY: ~5.3%</span>
            </div>
          </div>
        )}
      </div>

      <footer className="w-full max-w-2xl mt-8 text-sm text-white rounded-xl p-4"
        style={{
          background: 'linear-gradient(to right, rgba(87,146,255,0.15), rgba(87,146,255,0.15))',
        }}
      >
        <h3 className="text-white font-bold mb-2">The Koru Symbol</h3>
        <p className="text-white leading-relaxed">
          The yacht featured in the background is named <strong>Koru</strong>, built for Jeff Bezos in 2023. 
          The word “Koru” is a Māori term for a looped spiral — a symbol of new beginnings, 
          peace, and perpetual movement. This reflects the mission behind USDEC — to offer creators a fresh, stable foundation for economic freedom and growth.
        </p>
      </footer>
    </div>
  );
}
