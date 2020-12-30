CREATE SCHEMA `url` DEFAULT CHARACTER SET utf8 COLLATE utf8_bin;

create table url.short_urls (
  _id int not null auto_increment,
  url varchar(250) not null unique,
  primary key (_id)
);