import { GraduationCap } from 'lucide-react'

export default function SideBar() {
    return (
        <aside className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-[#1488CC] to-[#2B32B2] px-10 py-12 text-white lg:px-16">
            <div className="w-full max-w-xl">
                {/* Icon */}
                <GraduationCap className="w-[100px] h-[100px]" strokeWidth={1.2} />

                {/* Main Title */}
                <h1 className="text-[64px] font-bold leading-tight tracking-tight mb-4">
                    Cogni Advisor
                </h1>

                {/* Sub Title */}
                <h2 className="text-2xl font-normal opacity-80 mb-6 tracking-wide">
                    AI-Powered University Academic Advising System
                </h2>

                {/* Description */}
                <p className="text-[18px] font-light opacity-75 leading-relaxed max-w-[500px]">
                    Empowering students, advisors, and administrators with intelligent
                    academic planning
                </p>
            </div>
        </aside>
    )
}