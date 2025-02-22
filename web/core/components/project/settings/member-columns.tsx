import { observer } from "mobx-react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Disclosure } from "@headlessui/react";
import { IUser, IWorkspaceMember } from "@plane/types";
import { CustomSelect, PopoverMenu, TOAST_TYPE, setToast } from "@plane/ui";
import { ROLE } from "@/constants/workspace";
import { useMember, useUser } from "@/hooks/store";
import { EUserPermissions } from "@/plane-web/constants/user-permissions";

export interface RowData {
  member: IWorkspaceMember;
  role: EUserPermissions;
}

type NameProps = {
  rowData: RowData;
  workspaceSlug: string;
  isAdmin: boolean;
  currentUser: IUser | undefined;
  setRemoveMemberModal: (rowData: RowData) => void;
};

type AccountTypeProps = {
  rowData: RowData;
  currentProjectRole: EUserPermissions | undefined;
  workspaceSlug: string;
  projectId: string;
};

export const NameColumn: React.FC<NameProps> = (props) => {
  const { rowData, workspaceSlug, isAdmin, currentUser, setRemoveMemberModal } = props;
  return (
    <Disclosure>
      {({}) => (
        <div className="relative group">
          <div className="flex items-center gap-x-4 gap-y-2 w-72 justify-between">
            <div className="flex items-center gap-x-4 gap-y-2 flex-1">
              {rowData.member.avatar && rowData.member.avatar.trim() !== "" ? (
                <Link href={`/${workspaceSlug}/profile/${rowData.member.id}`}>
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-full p-4 capitalize text-white">
                    <img
                      src={rowData.member.avatar}
                      className="absolute left-0 top-0 h-full w-full rounded-full object-cover"
                      alt={rowData.member.display_name || rowData.member.email}
                    />
                  </span>
                </Link>
              ) : (
                <Link href={`/${workspaceSlug}/profile/${rowData.member.id}`}>
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 p-4 capitalize text-white">
                    {(rowData.member.email ?? rowData.member.display_name ?? "?")[0]}
                  </span>
                </Link>
              )}
              {rowData.member.first_name} {rowData.member.last_name}
            </div>

            {(isAdmin || rowData.member?.id === currentUser?.id) && (
              <PopoverMenu
                data={[""]}
                keyExtractor={(item) => item}
                popoverClassName="justify-end"
                buttonClassName="outline-none	origin-center rotate-90 size-8 aspect-square flex-shrink-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                render={() => (
                  <div
                    className="flex items-center gap-x-3 cursor-pointer"
                    onClick={() => setRemoveMemberModal(rowData)}
                  >
                    <Trash2 className="size-3.5 align-middle" />
                    {rowData.member?.id === currentUser?.id ? "Leave " : "Remove "}
                  </div>
                )}
              />
            )}
          </div>
        </div>
      )}
    </Disclosure>
  );
};

export const AccountTypeColumn: React.FC<AccountTypeProps> = observer((props) => {
  const { rowData, currentProjectRole, projectId, workspaceSlug } = props;
  // form info
  const {
    control,
    formState: { errors },
  } = useForm();
  // store hooks
  const {
    project: { updateMember },
    workspace: { getWorkspaceMemberDetails },
  } = useMember();
  const { data: currentUser } = useUser();

  // derived values
  const isCurrentUser = currentUser?.id === rowData.member.id;
  const isAdminOrGuest = [EUserPermissions.ADMIN, EUserPermissions.GUEST].includes(rowData.role);
  const userWorkspaceRole = getWorkspaceMemberDetails(rowData.member.id)?.role;
  const isRoleNonEditable = isCurrentUser || (isAdminOrGuest && userWorkspaceRole !== EUserPermissions.MEMBER);

  const checkCurrentOptionWorkspaceRole = (value: string) => {
    const currentMemberWorkspaceRole = getWorkspaceMemberDetails(value)?.role as EUserPermissions | undefined;
    if (!value || !currentMemberWorkspaceRole) return ROLE;

    const isGuestOROwner = [EUserPermissions.ADMIN, EUserPermissions.GUEST].includes(currentMemberWorkspaceRole);

    return Object.fromEntries(
      Object.entries(ROLE).filter(([key]) => !isGuestOROwner || [currentMemberWorkspaceRole].includes(parseInt(key)))
    );
  };

  return (
    <>
      {isRoleNonEditable ? (
        <div className="w-32 flex ">
          <span>{ROLE[rowData.role as keyof typeof ROLE]}</span>
        </div>
      ) : (
        <Controller
          name="role"
          control={control}
          rules={{ required: "Role is required." }}
          render={({ field: { value } }) => (
            <CustomSelect
              value={value}
              onChange={(value: EUserPermissions) => {
                if (!workspaceSlug) return;

                updateMember(workspaceSlug.toString(), projectId.toString(), rowData.member.id, {
                  role: value as unknown as EUserPermissions, // Cast value to unknown first, then to EUserPermissions
                }).catch((err) => {
                  console.log(err, "err");
                  const error = err.error;
                  const errorString = Array.isArray(error) ? error[0] : error;

                  setToast({
                    type: TOAST_TYPE.ERROR,
                    title: "Error!",
                    message: errorString ?? "An error occurred while updating member role. Please try again.",
                  });
                });
              }}
              label={
                <div className="flex ">
                  <span>{ROLE[rowData.role as keyof typeof ROLE]}</span>
                </div>
              }
              buttonClassName={`!px-0 !justify-start hover:bg-custom-background-100 ${errors.role ? "border-red-500" : "border-none"}`}
              className="rounded-md p-0 w-32"
              optionsClassName="w-full"
              input
            >
              {Object.entries(checkCurrentOptionWorkspaceRole(rowData.member.id)).map(([key, label]) => {
                if (parseInt(key) > (currentProjectRole ?? EUserPermissions.GUEST)) return null;
                return (
                  <CustomSelect.Option key={key} value={key}>
                    {label}
                  </CustomSelect.Option>
                );
              })}
            </CustomSelect>
          )}
        />
      )}
    </>
  );
});
