import { useState } from 'react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useContractWrite,
  usePrepareContractWrite,
  useBalance,
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

  const { data: balanceData } = useBalance({
    address,
    token: USDEC_ADDRESS,
    watch: true,
    enabled: isConnected,
  });

  return (
    <div className="min-h-screen flex flex-col items-center">
      {/* Dark top section */}
      <div className="w-full flex flex-col items-center p-6" style={{ backgroundColor: '#4B4B4B' }}>
        <Image
          src="/usdec-brand.png"
          alt="USDEC Logo"
          width={160}
          height={160}
        />
        <h1 className="text-xl text-white font-semibold mt-2">
          USDEC (pronounced “US Deck”)
        </h1>
        <p className="text-sm text-gray-300 italic">
          A Stablecoin for the Creator Economy
        </p>
      </div>

      {/* Light bottom section */}
      <div className="w-full flex flex-col items-center bg-white py-10 px-4">
        <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-sm text-center mb-6 border border-gray-200">
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
                {balanceData ? `${balanceData.formatted} USDEC` : '...'}
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

        {/* Morpho block */}
        <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-sm text-center border-2 border-[#0399C4]">
          <div className="flex justify-center mb-4">
            <Image
              src="/morpho-logo.svg"
              alt="Morpho Logo"
              width={120}
              height={32}
            />
          </div>
          <h2 className="text-xl font-semibold text-[#0399C4] mb-2">
            Earn Yield with Morpho
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Stake USDC to earn passive yield. Powered by Morpho’s secure DeFi protocol.
          </p>
          <button
            disabled
            className="w-full p-2 rounded bg-[#0399C4] text-white font-semibold opacity-60 cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}
