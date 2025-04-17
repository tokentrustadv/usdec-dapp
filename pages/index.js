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
    enabled: isConnected && isValidAmount,
    args: isValidAmount ? [BigInt(parsedAmount * 1e6)] : undefined, // Mint expects uint256
  });

  const { write, isLoading } = useContractWrite(config);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>USDEC Testnet</h1>
      <ConnectButton />
      {isConnected && (
        <div style={{ marginTop: '2rem' }}>
          <input
            type="number"
            placeholder="Enter USDC Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
          />
          <button
            onClick={() => write?.()}
            disabled={!write || isLoading}
            style={{
              marginLeft: '1rem',
              backgroundColor: isValidAmount ? '#0070f3' : '#999',
              color: '#fff',
              padding: '0.5rem 1rem',
              cursor: isValidAmount ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? 'Minting...' : 'Mint USDEC'}
          </button>
        </div>
      )}
    </div>
  );
}
