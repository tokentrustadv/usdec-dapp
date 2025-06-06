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

const USDEC_ADDRESS = '0xd28Bed330462C05D27096FEd52dBC170c8A2Fa1a';

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

  useEffect(() => {
    if (address) {
      fetch(
        `https://api-sepolia.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=3&sort=desc`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.result) {
            const recentMints = data.result.filter(
              (tx) =>
                tx.to.toLowerCase() === USDEC_ADDRESS.toLowerCase() &&
                tx.input.startsWith('0x1249c58b') // method id for mint()
            );
            setMintHistory(recentMints);
          }
        });
    }
  }, [address]);

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
          </div>
        )}
      </div>

      {/* Morpho Blue APY */}
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

      {/* Redemption Notice & History */}
      <div className="w-full max-w-2xl text-left mb-4 bg-white bg-opacity-70 p-4 rounded-lg">
        <p className="text-sm text-gray-800 mb-1">
          USDEC can be redeemed 30 days after mint.
        </p>
        <p className="text-sm text-gray-800 mb-3">
          A single redeem call will return all eligible amounts.
        </p>
        {mintHistory.length > 0 && (
          <div className="text-sm text-gray-800">
            <p className="font-semibold mb-1">Last 3 Mints:</p>
            <ul className="list-disc pl-5">
              {mintHistory.map((tx) => (
                <li key={tx.hash}>
                  <a
                    href={`https://sepolia.basescan.org/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Tx: {tx.hash.slice(0, 10)}... on {new Date(tx.timeStamp * 1000).toLocaleDateString()}
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
          background: 'linear-gradient(to right, rgba(87,146,255,0.25), rgba(87,146,255,0.35))',
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
