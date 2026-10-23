class Api::V1::FriendsController < Api::V1::BaseController
  rate_limit to: 30, within: 1.hour, only: :create,
    with: -> { render_error(:too_many_requests, "rate_limit_exceeded", "Too many invites accepted. Try again later.") }

  def index
    friends = Current.user.friends.order(:handle).to_a
    cup_today_ids = User.ids_with_cup_today(friends.map(&:id))
    render_data(friends.map { |friend| friend_json(friend, cup_today_ids) })
  end

  # Accepts an invite link. Both people become friends at once; there is no
  # request to approve, since sharing the link was the inviter's yes.
  def create
    inviter = User.find_by!(invite_token: params.require(:invite_token))
    if inviter == Current.user
      return render_error(:unprocessable_entity, "own_invite", "That's your own invite link.")
    end

    added = Friendship.connect!(Current.user, inviter)
    render_data(friend_json(inviter, User.ids_with_cup_today([ inviter.id ])), status: added ? :created : :ok)
  rescue Friendship::LimitReached
    render_error(:unprocessable_entity, "friend_limit_reached", "One of you already has #{Friendship::LIMIT} friends.")
  end

  def destroy
    friend = Current.user.friends.find(params[:id])
    Friendship.disconnect!(Current.user, friend)
    head :no_content
  end
end
