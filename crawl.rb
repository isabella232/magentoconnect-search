#! /usr/bin/env ruby

require 'rubygems'
require 'open-uri'
require 'nokogiri'
require 'algoliasearch'

objects = []
1.upto(871) do |page|
  html = Nokogiri::HTML open("http://www.magentocommerce.com/magento-connect/catalogsearch/result/?id=&s=1&pl=0&eb=0&hp=0&q=&t=0&p=#{page}").read
  (html / 'li.featured-extension').each do |ext|
    price = (ext / '.price').text.strip.gsub('$', '').to_f
    price_range = if price < 1
      'Free'
    elsif price < 10
      '< $10'
    elsif price < 20
      '$10 - $20'
    elsif price < 30
      '$20 - $30'
    elsif price < 50
      '$30 - $50'
    elsif price < 100
      '$50 - $100'
    else
      '> $100'
    end
    rating = (ext / 'li.rating img').attr('alt').to_s.to_f rescue 0.0
    obj = {
      title: (ext / '.featured-extension-title').text.strip,
      link: (ext / '.featured-extension-title a').attr('href').to_s,
      thumbnail_url: (ext / 'img.featured-extension-icon').attr('src').to_s,
      popularity: (ext / 'li.downloads a').text.strip.to_i,
      rating: rating,
      rating_i: rating.round,
      price: price,
      price_range: price_range,
      short_description: (ext / '.featured-extension-description').text.strip
    }
    p obj
    objects << obj
  end
end

Algolia.init application_id: ENV['ALGOLIA_APPLICATION_ID'], api_key: ENV['ALGOLIA_API_KEY']
index = Algolia::Index.new('magento-connect')
index.clear
index.set_settings({
  attributesToIndex: ['unordered(title)', 'unordered(short_description)'],
  customRanking: ['desc(rating_i)', 'desc(popularity)'],
  attributesForFaceting: ['price_range', 'rating_i']
})
index.add_objects objects
