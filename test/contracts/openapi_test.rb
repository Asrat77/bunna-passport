require "test_helper"
require "yaml"

class OpenapiTest < ActiveSupport::TestCase
  setup do
    @document = YAML.safe_load_file(Rails.root.join("docs/openapi.yml"))
  end

  test "is an OpenAPI 3.1 document with resolvable local references" do
    assert_match(/\A3\.1\./, @document.fetch("openapi"))

    references_in(@document).each do |reference|
      assert reference.start_with?("#/"), "external reference is not allowed: #{reference}"
      target = reference.delete_prefix("#/").split("/").reduce(@document) { |node, key| node&.fetch(key, nil) }
      assert target, "unresolved OpenAPI reference: #{reference}"
    end
  end

  test "documents every public API operation and no invented operation" do
    assert_equal route_operations, documented_operations
  end

  test "every operation declares at least one response" do
    @document.fetch("paths").each_value do |path_item|
      path_item.slice(*http_methods).each do |method, operation|
        assert operation.fetch("responses").any?, "#{method.upcase} operation has no responses"
      end
    end
  end

  private
    def route_operations
      Rails.application.routes.routes.filter_map do |route|
        controller = route.defaults[:controller].to_s
        next unless controller.start_with?("api/v1/")

        path = route.path.spec.to_s
          .delete_suffix("(.:format)")
          .gsub(/:([a-z_]+)/, '{\1}')
          .delete_prefix("/api/v1")
        route.verb.split("|").map { |verb| "#{verb.downcase} #{path}" }
      end.flatten.sort
    end

    def documented_operations
      @document.fetch("paths").flat_map do |path, item|
        item.keys.intersection(http_methods).map { |method| "#{method} #{path}" }
      end.sort
    end

    def http_methods
      %w[ get post put patch delete options head trace ]
    end

    def references_in(value)
      case value
      when Hash
        value.flat_map do |key, nested|
          key == "$ref" ? [ nested ] : references_in(nested)
        end
      when Array
        value.flat_map { |nested| references_in(nested) }
      else
        []
      end
    end
end
