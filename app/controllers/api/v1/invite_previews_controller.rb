class Api::V1::InvitePreviewsController < Api::V1::BaseController
  # Who sent the link someone just opened, so they can say yes knowingly.
  def show
    inviter = User.find_by!(invite_token: params[:token])
    render_data({
      inviter: friend_json(inviter, User.ids_with_cup_today([ inviter.id ])),
      own: inviter == Current.user,
      already_friends: Current.user.friendships.exists?(friend: inviter),
      # Likely their first time in the app, so the screen says what it is.
      new_here: !Current.user.check_ins.exists?
    })
  end
end
