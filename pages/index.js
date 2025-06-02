import { useState } from 'react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useBalance,
  useContractWrite,
  useContractRead,
  usePrepareContractWrite,
} from 'wagmi';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65'; // your deployed contract

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

  const { data: mintTimestamp } = useContractRead({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'userMintTimestamp',
    args: [address],
    enabled: isConnected,
    watch: true,
  });

  const unlockTime = mintTimestamp
    ? new Date(Number(mintTimestamp) * 1000 + 30 * 24 * 60 * 60 * 1000)
    : null;

  const remaining = unlockTime
    ? formatDistanceToNowStrict(unlockTime, { addSuffix: true })
    : null;

  const canRedeem = unlockTime ? Date.now() >= unlockTime.getTime() : false;

  const { config: redeemConfig } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'redeem',
    args: [
      balanceData
        ? BigInt(Math.floor(parseFloat(balanceData.formatted) * 1e18))
        : 0n,
    ],
    enabled: isConnected && balanceData && parseFloat(balanceData.formatted) > 0 && canRedeem,
  });

  const { write: redeemWrite, isLoading: isRedeeming } = useContractWrite({
    ...redeemConfig,
    onSuccess() {
      toast.success('Redeemed successfully!');
    },
    onError(error) {
      toast.error(error.message || 'Redemption failed');
    },
  });

  return (
    <div className="min-h-screen flex flex-col items-center p-4" style={{ backgroundColor: '#4B4B4B' }}>
      <div className="flex flex-col items-center mb-6">
        <Image
          src="/usdec-brandtrans.png"
          alt="USDEC Logo"
          width={160}
          height={160}
        />
        <p className="text-sm italic text-white">
          (pronounced “US Deck”)<br />
          A Stablecoin for the Creator Economy
        </p>
      </div>

      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-sm text-center mb-6">
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
              <strong>USDEC Balance:</strong>{' '}
              {balanceData ? `${balanceData.formatted} USDEC` : '...'}
            </div>

            {remaining && (
              <p className="text-sm mt-2 text-gray-700">
                Redemption available {remaining}
              </p>
            )}

            {canRedeem && redeemWrite && (
              <button
                onClick={() => redeemWrite?.()}
                disabled={isRedeeming}
                className={`w-full mt-2 p-2 rounded text-white ${
                  isRedeeming ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isRedeeming ? 'Redeeming...' : 'Redeem USDEC'}
              </button>
            )}

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
  );
}
