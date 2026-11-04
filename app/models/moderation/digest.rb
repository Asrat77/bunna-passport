# The morning summary of what is waiting in the moderation console: pending
# contributions by kind, pending reports and flagged check-ins. Sent to the
# moderators in Telegram (see SendModerationDigestJob) so the queues get looked
# at without anyone remembering to open the console.
#
# A few of the oldest easy cases come along with buttons, so they can be
# settled from the chat: flagged check-ins (verify or reject) and suggested
# edits to an existing café (approve or reject). New cafés, photos and reports
# need the map, the image or the context, so they stay in the console.
class Moderation::Digest
  QUICK_ITEM_LIMIT = 5

  CONTRIBUTION_KINDS = {
    "Shop::Submission" => "new café",
    "Shop::Edit" => "café edit",
    "Shop::PhotoSubmission" => "photo"
  }.freeze

  # Pending contributions per kind, with every kind present.
  def contributions
    @contributions ||= CONTRIBUTION_KINDS.keys.index_with(0).merge(Contribution.pending.group(:contributable_type).count)
  end

  def reports
    @reports ||= Report.pending.count
  end

  def flagged_check_ins
    @flagged_check_ins ||= CheckIn.flagged.count
  end

  def total
    contributions.values.sum + reports + flagged_check_ins
  end

  def empty?
    total.zero?
  end

  # Oldest first, since they have waited longest. Check-ins before edits:
  # a flagged visit is holding someone's stamp level back.
  def quick_items(limit: QUICK_ITEM_LIMIT)
    @quick_items ||= {}
    @quick_items[limit] ||= find_quick_items(limit)
  end

  private
    def find_quick_items(limit)
      check_ins = CheckIn.flagged.includes(:user, :shop).order(:occurred_at, :id).limit(limit).to_a
      edits = Contribution.pending.where(contributable_type: "Shop::Edit")
        .includes(:user, contributable: :shop).order(:created_at, :id).limit(limit - check_ins.size).to_a

      check_ins + edits
    end
end
