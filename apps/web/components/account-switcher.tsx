"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  useClerk,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AdjustmentsHorizontalIcon,
  BuildingOffice2Icon,
  Cog8ToothIcon,
  ComputerDesktopIcon,
  UserIcon,
  UserPlusIcon,
} from "@heroicons/react/24/solid";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

const PersonalWorkspaceHeader = () => {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user?.id) return null;

  return (
    <DropdownMenu.Group className="px-3 py-2">
      <div className="py-4 flex flex-row">
        <ComputerDesktopIcon className="mr-2 w-auto h-11" />
        <div>
          <p className="text-lg">{user.fullName}</p>
          <p className="text-sm">Personal Workspace</p>
        </div>
      </div>
    </DropdownMenu.Group>
  );
};

const ActiveOrganizationHeader = ({
  setMenuOpen,
}: {
  setMenuOpen: Function;
}) => {
  const { user, isLoaded } = useUser();
  const { organization, memberships } = useOrganization({
    memberships: {
      infinite: true,
    },
  });
  const clerk = useClerk();

  if (!isLoaded || !user?.id || !organization?.id) return null;

  const handleOpenOrgSettings = () => {
    console.log("clicked");
    clerk.openUserProfile();
    setMenuOpen(false);
  };

  return (
    <DropdownMenu.Group className="px-3 py-2">
      <div className="py-4 flex flex-row">
        {organization?.hasImage ? (
          <img
            className="h-11 rounded w-auto mr-2"
            src={organization.imageUrl}
            alt={`${organization.name} logo`}
          />
        ) : (
          <BuildingOffice2Icon className="mr-2 w-auto h-11" />
        )}
        <div>
          <p className="text-lg">{organization.name}</p>
          <p className="text-sm text-gray-500">
            {memberships && memberships.data && memberships.data.length} member
            {memberships &&
              memberships.data &&
              memberships?.data?.length > 1 &&
              "s"}
          </p>
        </div>
      </div>
      <div className="flex flex-row text-sm">
        <button
          className="flex flex-row items-center rounded py-2 px-2 text-gray-500 border border-gray-400 mr-2 hover:bg-gray-100"
          type="button"
          onClick={() => handleOpenOrgSettings()}
        >
          <Cog8ToothIcon className="mr-2 h-4 w-auto" />
          Settings
        </button>
        <button
          className="flex flex-row items-center rounded py-2 px-2 text-gray-500 border border-gray-400 ml-2 hover:bg-gray-100"
          type="button"
        >
          <UserPlusIcon className="mr-2 h-4 w-auto" />
          Invite members
        </button>
      </div>
    </DropdownMenu.Group>
  );
};

const UserProfileMenuItem = ({ setMenuOpen }: { setMenuOpen: Function }) => {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();

  if (!isLoaded || !user?.id) return null;

  const handleOpenProfileSettings = () => {
    console.log("clicked");
    clerk.openUserProfile();
    setMenuOpen(false);
  };

  return (
    <DropdownMenu.Item className="outline-none px-3 py-2 flex flex-row items-center text-gray-500">
      <div className=" grow flex justify-start">
        {user.primaryEmailAddress?.emailAddress}
      </div>
      <button className="py-3" onClick={() => handleOpenProfileSettings()}>
        <AdjustmentsHorizontalIcon className="mr-2 h-4 w-auto" />
      </button>
    </DropdownMenu.Item>
  );
};

const OrganizationListMenuItemWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <DropdownMenu.Item className="flex flex-row items-center justify-center w-full px-3 py-2">
      {children}
    </DropdownMenu.Item>
  );
};

const OrganizationList = () => {
  const { user } = useUser();
  const { userMemberships, userInvitations, setActive } = useOrganizationList({
    userMemberships: true,
    userInvitations: true,
    userSuggestions: true,
  });
  const { organization } = useOrganization();

  if (!user?.id || !setActive) return null;

  console.log("test", userInvitations);

  if (!userMemberships.data || userMemberships.data.length === 0) return null;

  return (
    <DropdownMenu.Group>
      {userMemberships.data.map((membership) => {
        // skip rendering an entry if the org is the currently active organization
        // if it is, its details will be in the ActiveOrganizationHeader already
        if (membership.organization.id !== organization?.id) {
          return (
            <OrganizationListMenuItemWrapper key={membership.id}>
              <button
                type="button"
                className="flex flex-row w-full text-gray-500"
                onClick={() =>
                  setActive({ organization: membership.organization.id })
                }
              >
                {membership.organization.hasImage ? (
                  <img
                    className="h-6 w-auto rounded mr-2"
                    src={membership.organization.imageUrl}
                    alt={`${membership.organization.name} logo`}
                  />
                ) : (
                  <BuildingOffice2Icon className="mr-2 h-6 w-auto" />
                )}
                {membership.organization.name}
              </button>
            </OrganizationListMenuItemWrapper>
          );
        }
      })}
      {userInvitations &&
        userInvitations.data &&
        userInvitations.data.length > 0 &&
        userInvitations.data.map((invitation) => (
          <OrganizationListMenuItemWrapper key={invitation.id}>
            {invitation.publicOrganizationData.hasImage ? (
              <img
                src={invitation.publicOrganizationData.imageUrl}
                alt={`${invitation.publicOrganizationData.name} logo`}
              />
            ) : (
              <BuildingOffice2Icon className="mr-2 h-6 w-auto text-gray-500" />
            )}
            <span className="grow text-gray-500">
              {invitation.publicOrganizationData.name}
            </span>

            <button
              type="button"
              className="flex flex-row rounded border-2 border-purple-700 px-2"
              onClick={() => invitation.accept()}
            >
              <span className="text-purple-700">Join</span>
            </button>
          </OrganizationListMenuItemWrapper>
        ))}
      <OrganizationListMenuItemWrapper key={"personal-workspace"}>
        <button
          type="button"
          className="flex flex-row w-full text-gray-500"
          onClick={() => setActive({ organization: null })}
        >
          <ComputerDesktopIcon className="mr-2 h-6 w-auto" />
          Personal Worksapce
        </button>
      </OrganizationListMenuItemWrapper>
    </DropdownMenu.Group>
  );
};

const MultiSessionSignInButton = () => {
  const { isSignedIn, openSignIn } = useClerk();

  if (!isSignedIn) return null;

  return (
    <DropdownMenu.Item className="outline-none px-3 py-2 text-gray-500">
      <button onClick={() => openSignIn()}>Add another account</button>
    </DropdownMenu.Item>
  );
};

const SignOutButton = () => {
  const { isSignedIn, signOut } = useClerk();
  const router = useRouter();

  if (!isSignedIn) return null;

  return (
    <DropdownMenu.Item className="outline-none px-3 py-2 text-gray-500">
      <button onClick={() => signOut(() => router.push("/sign-in"))}>
        Sign out
      </button>
    </DropdownMenu.Item>
  );
};

// Create a new UserButtonandMenu component and move the old return into this
export const AccountSwitcher = () => {
  const { user, isLoaded } = useUser();
  const { openSignIn } = useClerk();
  const { organization } = useOrganization();
  const [open, setOpen] = React.useState(false);

  if (!isLoaded) return <Skeleton className="min-w-[190px] h-[54px]" />;

  if (!user?.id)
    return (
      <button
        className="bg-white/75 text-gray-600 py-2 px-3 rounded"
        type="button"
        onClick={() => openSignIn()}
      >
        Sign In
      </button>
    );

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild className="outline-none">
        <Button variant="accent" className="min-w-[192px]">
          {user.hasImage ? (
            <Image
              alt={user.fullName ? user.fullName : "User Profile Image"}
              src={user.imageUrl}
              width={30}
              height={30}
              className="mr-2 rounded-full border border-stone-950 drop-shadow-sm"
            />
          ) : (
            <UserIcon className="mr-2 h-6 w-auto" />
          )}
          {user.fullName ? user.fullName : "User"}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="mt-4 w-80 rounded-xl border border-gray-200 bg-white text-black drop-shadow-2xl pb-2">
          <DropdownMenu.Label />

          {organization?.id ? (
            <ActiveOrganizationHeader setMenuOpen={setOpen} />
          ) : (
            <PersonalWorkspaceHeader />
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />

          <UserProfileMenuItem setMenuOpen={setOpen} />
          <OrganizationList />

          <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />

          <MultiSessionSignInButton />
          <SignOutButton />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
