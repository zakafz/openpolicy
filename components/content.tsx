import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function ContentSection() {
    return (
        <section className="py-16">
            <div className="mx-auto space-y-8 md:space-y-12">
                <img
                    src="/demo-4.png"
                    alt="team image"
                    height=""
                    width=""
                    loading="lazy"
                />

                <div className="grid gap-6 md:grid-cols-2 md:gap-12">
                    <h2 className="text-4xl font-medium">OpenPolicy is a new and innovative way to host, manage, and update your policies and documents.</h2>
                    <div className="space-y-6">
                        <p>Inspired by OpenStatus, OpenPolicy is a new and innovative way to host, manage, and update your policies and documents. We are actively working on it and we are excited to see what you will build with it.</p>
                        <Link href="/auth/login">
                            <Button
                                size="sm"
                                className="gap-1 pr-1.5 flex flex-row">
                                <span>Get Started</span>
                                <ChevronRight className="size-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
