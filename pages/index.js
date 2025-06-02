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

  const { data: mintTimestamp } = useContractRead({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'userMintTimestamp',
    args: [address],
    enabled: isConnected,
    watch: true,
  });

  const { data: totalMinted } = useContractRead({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'userTotalMinted',
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
    <div className="relative min-h-screen w-full text-white">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/koru-bg.png"
          alt="Background"
          layout="fill"
          objectFit="cover"
          quality={100}
        />
        <div className="absolute inset-0 bg-black bg-opacity-60" />
      </div>

      {/* Overlay Text */}
      <div className="absolute top-8 w-full flex justify-center z-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center drop-shadow-lg">
          Koru — A New Loop in Creator Finance Begins Here
        </h1>
      </div>

      {/* Main Panel */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <div className="backdrop-blur-md bg-white/10 border border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-sm text-center">
          <div className="flex flex-col items-center mb-4">
            <Image
              src="/usdec-brandtrans.png"
              alt="USDEC Logo"
              width={140}
              height={140}
            />
            <p className="text-sm italic mt-1 text-gray-200">
              (pronounced “US Deck”)<br />
              A Stablecoin for the Creator Economy
            </p>
          </div>

          <ConnectButton />

          {isConnected && (
            <div className="mt-4 text-white">
              <input
                type="number"
                placeholder="Amount (Max 500 USDC)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full p-2 border border-gray-300 text-black rounded mb-2"
              />

              {isValidAmount && (
                <p className="text-sm text-gray-300 mb-2">
                  Fee: {(parsedAmount * 0.01).toFixed(2)} USDC • Vault: {(parsedAmount * 0.99).toFixed(2)} USDC
                </p>
              )}

              <button
                onClick={() => write?.()}
                disabled={!write || isLoading || !isValidAmount}
                className={`w-full p-2 rounded font-semibold ${
                  !write || isLoading || !isValidAmount
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? 'Minting...' : 'Mint USDEC'}
              </button>

              <div className="mt-4 space-y-1 text-sm">
                <div><strong>USDEC Balance:</strong> {balanceData ? `${balanceData.formatted}` : '0.0000'}</div>
                <div><strong>Total USDC Minted:</strong> {totalMinted ? `${(Number(totalMinted) / 1e6).toFixed(4)}` : '0.0000'}</div>
              </div>

              {remaining && (
                <p className="text-sm mt-2 text-gray-300">
                  Redemption available {remaining}
                </p>
              )}

              {canRedeem && redeemWrite && (
                <button
                  onClick={() => redeemWrite?.()}
                  disabled={isRedeeming}
                  className={`w-full mt-2 p-2 rounded text-white ${
                    isRedeeming ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'
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
                    className="text-blue-300 hover:underline text-xs"
                  >
                    View Transaction
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
