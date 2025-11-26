import { Card } from '@/components/ui/card'
import { BookOpenCheck, CalendarCheck, Layout, Scale, Sparkles, Target } from 'lucide-react'
import Image from 'next/image'

export default function FeaturesSection() {
    return (
        <section>
            <div className="py-8">
                <div className="mx-auto w-full">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card
                            className="col-span-full overflow-hidden rounded-none shadow-none pl-6 pt-6">
                            <div className="flex items-center justify-center p-2 bg-accent w-fit border"><Layout className="text-primary size-5" /></div>
                            <h3 className="text-foreground mt-5 text-lg font-semibold">Simple & Fast</h3>
                            <p className="text-muted-foreground mt-3 max-w-xl text-balance">Our dashboard is designed to be simple and fast to use. You can manage all your documents in one place. Our team is always working on new features to make your experience even better.</p>
                            <div className="mask-b-from-95% -ml-2 -mt-2 mr-0.5 pl-2 pt-2">
                                <div className="bg-background ring-foreground/5 relative mx-auto mt-8 h-96 overflow-hidden border border-transparent shadow ring-1">
                                    <Image
                                        src="/demo-1.png"
                                        alt="app screen"
                                        width={2880}
                                        height={1842}
                                        className="object-top-left h-full object-cover"
                                    />
                                </div>
                            </div>
                        </Card>
                        <Card
                            className="p-6 rounded-none shadow-none">
                            <div className="flex items-center justify-center p-2 bg-accent w-fit border"><Scale className="text-primary size-5" /></div>
                            <h3 className="text-foreground mt-5 text-lg font-semibold">Legal Documents</h3>
                            <p className="text-muted-foreground mt-3 text-balance">Host and manage your legal documents with ease. A central repository for all your legal documents.</p>
                        </Card>

                        <Card
                            className="p-6 rounded-none shadow-none">
                            <div className="flex items-center justify-center p-2 bg-accent w-fit border"><BookOpenCheck className="text-primary size-5" /></div>
                            <h3 className="text-foreground mt-5 text-lg font-semibold">Policies & Compliance</h3>
                            <p className="text-muted-foreground mt-3 text-balance">Stop getting lost in your policies and compliance documents. Stop searching for the right document and start using OpenPolicy.</p>
                        </Card>
                        <Card
                            className="p-6 rounded-none shadow-none">
                            <div className="flex items-center justify-center p-2 bg-accent w-fit border"><Sparkles className="text-primary size-5" /></div>
                            <h3 className="text-foreground mt-5 text-lg font-semibold">Other types of documents</h3>
                            <p className="text-muted-foreground mt-3 text-balance">From guides to onboarding documents, OpenPolicy helps you manage all your documents in one place.</p>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    )
}
