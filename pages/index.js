import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65';

export default function Home() {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState('');

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { config } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    args: isValidAmount ? [BigInt(Math.floor(parsedAmount * 1e6))] : undefined,
    enabled: isConnected && isValidAmount,
  });

  const { write, isLoading } = useContractWrite(config);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>USDEC Testnet App</h1>
      <ConnectButton />
      {isConnected && (
        <div style={{ marginTop: '2rem' }}>
          <input
            type="number"
            placeholder="Amount (e.g. 10)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
          />
          <button
            onClick={() => write?.()}
            disabled={!write || isLoading}
            style={{ marginLeft: '1rem' }}
          >
            {isLoading ? 'Minting...' : 'Mint USDEC'}
          </button>
        </div>
      )}
    </div>
  );
}
