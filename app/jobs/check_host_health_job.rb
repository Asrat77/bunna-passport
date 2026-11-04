# Warns before the shared EC2 disk fills. SQLite, Solid Queue and the backups
# all write to the storage volume, and a full disk stops every one of them.
class CheckHostHealthJob < ApplicationJob
  queue_as :default

  DISK_WARNING_PERCENT = 85

  def perform(path = Rails.root.join("storage").to_s)
    used = disk_used_percent(path)
    return if used.nil? || used < DISK_WARNING_PERCENT

    Ops::Alert.deliver(
      title: "Disk #{used}% full",
      details: "The storage volume (#{path}) is #{used}% used. Free space before SQLite and the job queue stop writing.",
      fingerprint: "disk_usage",
      throttle: 12.hours
    )
  end

  private
    # `df -P` prints one POSIX-format line per filesystem; column 5 is "Use%".
    def disk_used_percent(path)
      output = IO.popen([ "df", "-P", path ], err: File::NULL, &:read)
      return unless $?.success?

      output.lines.last.split[4].to_i
    rescue SystemCallError
      nil
    end
end
