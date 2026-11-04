class AddAvatarTraitsToUsers < ActiveRecord::Migration[8.1]
  def change
    # The profile picture parts chosen in the editor; null keeps the seed's own.
    add_column :users, :avatar_traits, :json
    # Which face a stored share card was drawn with, so an edit redraws it.
    add_column :share_images, :avatar_digest, :string
  end
end
