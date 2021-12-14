import Head from 'next/head'
import dynamic from 'next/dynamic';

const MainLayout = dynamic(() => import('./main'), { ssr: false });

export default function Home() {
  const ethereum = typeof window !== 'undefined'
    ? window['ethereum']
    : null;
  const mainLayout = ethereum
    ? <MainLayout ethereum={ethereum} />
    : <h3>Wallet plugin not found. Please install an Ethereum wallet plugin (e.g. Metamask)</h3>;
  return (
    <div>
      <Head>
        <title>Sendeet!</title>
        <meta name="description" content="Sendeet - Venmo on Ethereum" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        {mainLayout}
      </main>

      <footer></footer>
    </div>
  )
}
