import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useContractWrite, usePrepareContractWrite, useContractRead } from 'wagmi';
import { parseUnits } from 'viem';
import usdecAbi from '../usdecAbi.json';
import { toast } from 'react-hot-toast';

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65'; // Your contract

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { data: balanceData } = useContractRead({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'balanceOf',
    args: [address],
    watch: true,
  });

  const { config } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    args: isValidAmount ? [parseUnits(amount, 6)] : undefined,
    enabled: isConnected && isValidAmount,
  });

  const { write, isLoading, isSuccess } = useContractWrite({
    ...config,
    onSuccess() {
      toast.success('Minted successfully!');
    },
    onError(error) {
      toast.error(`Mint failed: ${error.message}`);
    },
  });

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h1 className="text-xl font-bold">USDEC Testnet App</h1>
      <ConnectButton />
      {isConnected && (
        <>
          <input
            type="number"
            placeholder="Amount (Max 500 USDC)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-4 p-2 border rounded w-full"
            min="0"
            step="0.01"
          />
          <button
            onClick={() => write?.()}
            disabled={!write || isLoading || !isValidAmount}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full"
          >
            {isLoading ? 'Minting...' : 'Mint USDEC'}
          </button>
          <p className="text-gray-700 mt-2">
            <strong>USDEC Balance:</strong>{' '}
            {balanceData ? Number(balanceData) / 1e6 : '0'} USDEC
          </p>
        </>
      )}
    </div>
  );
}
