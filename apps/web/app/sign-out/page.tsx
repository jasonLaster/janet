import { SignOutButton } from "@clerk/nextjs";

export default function SignOutPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <SignOutButton />
    </div>
  );
}
