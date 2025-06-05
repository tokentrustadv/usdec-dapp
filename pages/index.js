import { useState } from 'react';
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

  const mintDate = new Date('2025-06-05');
  const redemptionDate = new Date(mintDate);
  redemptionDate.setDate(mintDate.getDate() + 30);

  return (
    <div
      className="min-h-screen bg-cover bg-center flex flex-col items-center p-4"
      style={{
        backgroundImage: "url('/koru-bg-wide.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'FK Grotesk', sans-serif",
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

            <div className="mt-4 text-sm text-gray-700">
              <p><strong>Mint Date:</strong> {mintDate.toLocaleDateString()}</p>
              <p><strong>Redeem After:</strong> {redemptionDate.toLocaleDateString()}</p>
              <p className="text-xs text-gray-500 mt-1 italic">* A 30-day lock applies to all mints.</p>
            </div>
          </div>
        )}
      </div>

      {/* Morpho Logo and Info Block */}
      <div className="bg-white bg-opacity-80 backdrop-blur-sm rounded-2xl p-4 w-full max-w-sm mt-6 text-sm text-gray-800 shadow-lg flex flex-col items-center">
        <Image
          src="/morpho-logo.svg"
          alt="Morpho Logo"
          width={120}
          height={40}
          className="mb-2"
        />
        <p><strong>Total Deposited:</strong> 500 USDC</p>
        <p><strong>Estimated APY:</strong> 5.43%</p>
        <a
          href="https://app.morpho.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline mt-2 text-sm"
        >
          Morpho Blue
        </a>
      </div>

      {/* Koru Footer */}
      <div className="mt-10 p-4 w-full max-w-sm text-white text-sm leading-relaxed shadow-lg rounded-xl"
        style={{
          background: 'linear-gradient(135deg, #5792ff 0%, #005bff 100%)',
        }}
      >
        <h3 className="text-lg font-semibold mb-2">The Koru Symbol</h3>
        <p>
          The yacht featured in this Dapp is named <strong>Koru</strong>, built in 2023 and owned by Jeff Bezos.
          The name “Koru” comes from the Māori word for the spiral shape of an unfurling fern frond. It represents
          new beginnings, perpetual movement, and harmony.
        </p>
      </div>
    </div>
  );
}
