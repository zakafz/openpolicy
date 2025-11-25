import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import Section from '@/components/section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
 
export default function NotFound() {
  return (
    <>
      <Header />

      <Section className="p-0! -mt-14 min-h-screen flex-col gap-8 justify-center items-center flex">
          <div className='text-center gap-3'>
            <h1 className="text-8xl font-semibold">404</h1>
            <p className="text-muted-foreground">Page not found</p>
          </div>
          <Link href="/"><Button>Back home</Button></Link>
      </Section>
      <Footer />
    </> 
  )
}