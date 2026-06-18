import SideBar from "./_components/side-bar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="hidden lg:flex lg:min-h-screen">
        <SideBar />
      </div>
      <main className="flex min-h-screen w-full items-center justify-center bg-white p-6 lg:p-10">
        {children}
      </main>
    </div>
  );
}
