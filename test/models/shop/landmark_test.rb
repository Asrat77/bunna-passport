require "test_helper"

class Shop::LandmarkTest < ActiveSupport::TestCase
  EDNA = Shop::Landmark::Anchor.new(name: "Edna Mall", name_am: "ኤድና ሞል", latitude: 8.99706, longitude: 38.78661)
  HOTEL = Shop::Landmark::Anchor.new(name: "Friendship Hotel", name_am: "ፍሬንድሺፕ ሆቴል", latitude: 8.99401, longitude: 38.78459)

  test "flags landmarks nobody could walk to" do
    [
      "Bole, Addis Ababa", "Bole 3, 5", "1", "Sub City", "Unnamed Road", "Cameroon St", "836 Airport Rd",
      "38.784180, 8.994248", "XQVP+Q3X 123, Africa Ave", "BL_03_575 St", "Buna House - Bole, Namibia St"
    ].each do |text|
      assert landmark(text).weak?, "#{text.inspect} should be weak"
    end
  end

  test "keeps landmarks that point somewhere" do
    [ "Behind the test mall", "Mafi City Center Mall, Cameroon St", "Infront of Millenium Hall, Africa Ave", "bole, Hayat Hospital" ].each do |text|
      refute landmark(text).weak?, "#{text.inspect} should not be weak"
    end
  end

  test "suggests the nearest well-known place and keeps the street" do
    assert_equal "Cameroon St, 200 m from Edna Mall", landmark("Cameroon St", latitude: 8.99886, longitude: 38.78661).suggestion
    assert_equal "Near Edna Mall", landmark("Bole, Addis Ababa", latitude: 8.99730, longitude: 38.78661).suggestion
    assert_equal "Namibia St, near Edna Mall", landmark("104 Namibia St", latitude: 8.99730, longitude: 38.78661).suggestion
  end

  test "suggests nothing when every well-known place is far away" do
    assert_nil landmark("Piassa, Addis Ababa", latitude: 9.0357, longitude: 38.7507).suggestion
  end

  test "never suggests a place as its own landmark" do
    shop = shop_at("Bole, Addis Ababa", latitude: 8.99401, longitude: 38.78459, name: "Friendship International Hotel")

    assert_equal "Edna Mall", Shop::Landmark.new(shop, anchors: [ EDNA, HOTEL ]).nearest_anchor.first.name
  end

  test "ships a list of Bole landmarks" do
    assert_operator Shop::Landmark::ANCHORS.size, :>=, 20
    assert Shop::Landmark::ANCHORS.all? { |anchor| anchor.latitude.between?(8.9, 9.1) && anchor.longitude.between?(38.6, 38.9) }
  end

  private
    def landmark(text, **location)
      Shop::Landmark.new(shop_at(text, **location), anchors: [ EDNA, HOTEL ])
    end

    def shop_at(text, latitude: 8.9942, longitude: 38.7877, name: "Buna House")
      Shop.new(name: name, landmark: text, latitude: latitude, longitude: longitude, neighborhood: neighborhoods(:bole))
    end
end
