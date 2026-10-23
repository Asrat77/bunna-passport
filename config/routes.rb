Rails.application.routes.draw do
  resource :session
  resources :passwords, param: :token

  namespace :api, defaults: { format: :json } do
    namespace :v1 do
      resources :users, only: :create
      resources :sessions, only: :create
      delete "sessions/current", to: "sessions#destroy", as: :current_session
      resources :telegram_sessions, only: :create
      resources :password_resets, only: :create
      patch "password_reset", to: "password_resets#update", as: :password_reset

      resources :shops, only: %i[ index show create ] do
        resources :edits, controller: :shop_edits, only: :create
        resources :photos, controller: :shop_photos, only: :create
        resources :reviews, controller: :shop_reviews, only: :index
      end

      get "contributions/pending", to: "pending_contributions#show", as: :pending_contributions
      resources :contributions, only: %i[ index show ] do
        resources :confirmations, controller: :contribution_confirmations, only: :create
      end

      resources :check_ins, only: %i[ index create ]
      # A bare verb rather than :update, which would also route PUT and oblige
      # the contract to document a method nothing calls.
      patch "check_ins/:id", to: "check_ins#update", as: :check_in
      post "check_ins/:check_in_id/share_cards", to: "share_cards#create", as: :check_in_share_cards
      post "shops/:shop_id/share_cards", to: "share_cards#create", as: :shop_share_cards
      resource :passport, only: :show
      resource :profile, only: :show
      # PATCH only, for the same reason as check_ins above.
      patch "profile", to: "profiles#update"
      resources :badges, only: :index
      resources :friends, only: %i[ index create destroy ]
      get "feed", to: "feeds#show", as: :feed
      get "invite", to: "invites#show", as: :invite
      delete "invite", to: "invites#destroy"
      get "invites/:token", to: "invite_previews#show", as: :invite_preview
      resources :leaderboards, only: :index
      get "stats/me", to: "personal_stats#show", as: :personal_stats
      get "stats/city", to: "city_stats#show", as: :city_stats
      resources :reports, only: :create
    end
  end

  namespace :console do
    resource :dashboard, only: :show
    resources :contributions, only: %i[ index show ] do
      resource :approval, only: :create, module: :contributions
      resource :rejection, only: :create, module: :contributions
      resource :reversal, only: :create, module: :contributions
    end
    resources :reports, only: %i[ index show ] do
      resource :upholding, only: :create, module: :reports
      resource :dismissal, only: :create, module: :reports
      resource :reversal, only: :create, module: :reports
    end
    resources :check_ins, only: %i[ index show ] do
      resource :verification, only: :create, module: :check_ins
      resource :rejection, only: :create, module: :check_ins
    end
    resources :shops, except: :destroy do
      resource :merge, only: %i[ new create ], module: :shops
    end
    resources :shop_batches, only: %i[ new create ]
    resources :users, only: %i[ index show update ]
  end

  # Rendered share cards, fetched by Telegram and by phones saving the image.
  # Public on purpose: the unguessable token is the only key.
  get "cards/:token", to: "share_images#show", as: :share_image, constraints: { format: "png" }

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  root "console/dashboards#show"
end
