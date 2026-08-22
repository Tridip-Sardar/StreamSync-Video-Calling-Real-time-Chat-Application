import { Link } from "react-router";
import { LANGUAGE_TO_FLAG } from "../constants";
import { MoreVerticalIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unfriendUser, blockUser } from "../lib/api";
import toast from "react-hot-toast";

const FriendCard = ({ friend }) => {
  const queryClient = useQueryClient();

  const { mutate: unfriendMutation } = useMutation({
    mutationFn: unfriendUser,
    onSuccess: () => {
      toast.success("Unfriended successfully");
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Failed to unfriend")
  });

  const { mutate: blockMutation } = useMutation({
    mutationFn: blockUser,
    onSuccess: () => {
      toast.success("User blocked successfully");
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Failed to block user")
  });

  return (
    <div className="card bg-base-200 hover:shadow-md transition-shadow">
      <div className="card-body p-4">
        {/* USER INFO */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="avatar size-12">
              <img src={friend.profilePic} alt={friend.fullName} />
            </div>
            <h3 className="font-semibold truncate">{friend.fullName}</h3>
          </div>

          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm">
              <MoreVerticalIcon className="size-4 opacity-70" />
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
              <li>
                <button onClick={() => unfriendMutation(friend._id)}>Unfriend</button>
              </li>
              <li>
                <button onClick={() => blockMutation(friend._id)} className="text-error">Block</button>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="badge badge-secondary text-xs">
            {getLanguageFlag(friend.nativeLanguage)}
            Native: {friend.nativeLanguage}
          </span>
          <span className="badge badge-outline text-xs">
            {getLanguageFlag(friend.learningLanguage)}
            Learning: {friend.learningLanguage}
          </span>
        </div>

        <Link to={`/chat/${friend._id}`} className="btn btn-outline w-full">
          Message
        </Link>
      </div>
    </div>
  );
};
export default FriendCard;

export function getLanguageFlag(language) {
  if (!language) return null;

  const langLower = language.toLowerCase();
  const countryCode = LANGUAGE_TO_FLAG[langLower];

  if (countryCode) {
    return (
      <img
        src={`https://flagcdn.com/24x18/${countryCode}.png`}
        alt={`${langLower} flag`}
        className="h-3 mr-1 inline-block"
      />
    );
  }
  return null;
}
