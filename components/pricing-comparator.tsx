"use client"
import { Button } from '@/components/ui/button'
import { Product } from '@polar-sh/sdk/models/components/product.js'
import { Cpu, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchWorkspacesForOwner } from '@/lib/workspace'

const tableData = [
    {
        feature: 'Documents',
        free: "Up to 3 documents",
        scale: "Unlimited documents",
    },
    {
        feature: 'Rich Text Editor',
        free: true,
        scale: true,
    },
    {
        feature: 'Instant publishing',
        free: true,
        scale: true,
    },
    {
        feature: 'Custom domain',
        free: false,
        scale: true,
    },
    {
        feature: 'Custom subdomain',
        free: true,
        scale: true,
    },
    {
        feature: 'Custom branding',
        free: true,
        scale: true,
    },
    {
        feature: 'SEO optimization',
        free: true,
        scale: true,
    },
    {
        feature: 'Document status management',
        free: true,
        scale: true,
    },
    {
        feature: 'Priority support',
        free: false,
        scale: true,
    },
    {
        feature: 'Advanced analytics (coming soon)',
        free: false,
        scale: true,
    },
    {
        feature: 'API access (coming soon)',
        free: false,
        scale: true,
    },
    {
        feature: 'Team collaboration (coming soon)',
        free: false,
        scale: true,
    }
]


export default function PricingComparator({ plans }: { plans: Product[] }) {
    const router = useRouter()
    const [currentPlanId, setCurrentPlanId] = React.useState<string | null>(null)
    const [hasWorkspace, setHasWorkspace] = React.useState(false)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function fetchUserWorkspace() {
            try {
                const supabase = createClient()
                const { data, error } = await supabase.auth.getUser()
                const user = data?.user

                if (error || !user) {
                    setLoading(false)
                    return
                }

                const workspaces = await fetchWorkspacesForOwner(user.id, supabase)
                if (workspaces && workspaces.length > 0) {
                    setHasWorkspace(true)
                    setCurrentPlanId(workspaces[0].plan)
                }
            } catch (err) {
                console.error('Error fetching workspace:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchUserWorkspace()
    }, [])

    const getButtonText = (plan: Product) => {
        const isCurrentPlan = hasWorkspace && currentPlanId === plan.id

        if (isCurrentPlan) {
            return 'Current Plan'
        } else if (hasWorkspace && currentPlanId) {
            const currentPrice = plan.prices?.[0] as any
            const isFree = currentPrice?.amountType === 'free'

            if (isFree) {
                return 'Downgrade'
            } else {
                return 'Upgrade'
            }
        }

        return 'Get Started'
    }

    const handleButtonClick = async (plan: Product) => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase.auth.getUser()
            const user = data?.user

            if (error || !user) {
                router.push(`/auth/login`)
                return
            }

            if (hasWorkspace) {
                router.push(`/portal`)
            } else {
                router.push(`/create`)
            }
        } catch (err) {
            router.push(`/auth/login`)
        }
    }

    const scalePlan = plans.find(p => p.name === 'Scale')
    const hobbyPlan = plans.find(p => p.name === 'Hobby')

    return (
        <>
            <div className="mx-auto px-5">
                <div className="w-full overflow-auto lg:overflow-visible">
                    <table className="w-[200vw] border-separate border-spacing-x-3 md:w-full dark:[--color-muted:var(--color-zinc-900)]">
                        <thead className="bg-background sticky top-12">
                            <tr className="*:py-5 *:text-left *:font-medium">
                                <th className="lg:w-2/5"></th>
                                <th className="bg-muted px-4">
                                    <span className="block">Scale</span>
                                    <span className="block text-muted-foreground font-normal text-xs mt-1 mb-3">{plans.find(p => p.name === 'Scale')?.description || ''}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={scalePlan && (hasWorkspace && currentPlanId === scalePlan.id) || loading}
                                        onClick={() => scalePlan && handleButtonClick(scalePlan)}>
                                        {scalePlan ? getButtonText(scalePlan) : 'Get Started'}
                                    </Button>
                                </th>
                                <th>
                                    <span className="block">Free</span>
                                    <span className="block text-muted-foreground font-normal text-xs mt-1 mb-3">{plans.find(p => p.name === 'Hobby')?.description || ''}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={hobbyPlan && (hasWorkspace && currentPlanId === hobbyPlan.id) || loading}
                                        onClick={() => hobbyPlan && handleButtonClick(hobbyPlan)}>
                                        {hobbyPlan ? getButtonText(hobbyPlan) : 'Get Started'}
                                    </Button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-caption text-sm">
                            <tr className="*:py-3">
                                <td className="flex items-center gap-2 font-medium">
                                    <span>Features</span>
                                </td>
                                <td className="bg-muted border-none px-4"></td>
                                <td></td>
                            </tr>
                            {tableData.map((row, index) => (
                                <tr
                                    key={index}
                                    className="*:border-b *:py-3">
                                    <td className="text-muted-foreground">{row.feature}</td>
                                    <td className="bg-muted border-none px-4">
                                        <div className="-mb-3 border-b py-3">
                                            {row.scale === true ? (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                    className="size-4">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            ) : (
                                                row.scale === false ? (
                                                    "-"
                                                ) : (
                                                    row.scale
                                                )
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {row.free === true ? (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className="size-4">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        ) : (
                                            row.free === false ? (
                                                <div className="text-muted-foreground ml-1">-</div>
                                            ) : (
                                                row.free
                                            )
                                        )}
                                    </td>
                                </tr>
                            ))}
                            <tr className="*:py-5">
                                <td></td>
                                <td className="bg-muted border-none px-4"></td>

                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}
