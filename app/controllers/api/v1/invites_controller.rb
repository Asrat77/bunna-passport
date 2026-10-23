class Api::V1::InvitesController < Api::V1::BaseController
  # The caller's own invite link, to send with a share card or on its own.
  def show
    render_data(invite_json)
  end

  # Revokes the current link and returns a new one. Anyone already a friend
  # stays one.
  def destroy
    Current.user.rotate_invite_token!
    render_data(invite_json)
  end

  private
    def invite_json
      { token: Current.user.invite_token!, url: invite_url(Current.user), friends_count: Current.user.friendships.count }
    end
end
