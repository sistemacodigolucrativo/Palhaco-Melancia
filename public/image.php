<?php
declare(strict_types=1);
$slots=['img/logo-palhaco-melancia.svg','img/hero-novo.webp','img/sobre.webp','img/reels/capa-short-01.webp','img/parcerias.webp'];
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
$slot=ltrim($path,'/');
header('X-Content-Type-Options: nosniff');header('Cache-Control: no-store');
if(!in_array($slot,$slots,true)){http_response_code(404);exit('Imagem não encontrada.');}
$location='/var/lib/palhaco-melancia/images/'.hash('sha256',$slot);
if(!in_array($_SERVER['REQUEST_METHOD'],['GET','HEAD'],true)){http_response_code(405);exit;}
$file=is_file($location)?$location:__DIR__.'/'.$slot;
if(!is_file($file)){http_response_code(404);exit;}
$type=(new finfo(FILEINFO_MIME_TYPE))->file($file);header('Content-Type: '.$type);header('Content-Length: '.filesize($file));if($_SERVER['REQUEST_METHOD']==='GET')readfile($file);
