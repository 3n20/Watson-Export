'use strict';
var fs = require('fs');
require('dotenv').config({silent: true});
var json2xls = require('json2xls');
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var watson = require('watson-developer-cloud/assistant/v1');
var request = require('request');
var path = require('path');
app.use(bodyParser.json());

app.use(express.static(__dirname + '/views'));
app.post('/update', function (req, res)
{
    var wsid = req.body.wsid;
    var dtn = req.body.dtn;

    var dtnFinal = req.body.dtnFinal;

  var dt = new Date();
   //var dia =dt.getDate();
   //if(dt.getDate()<10) {
   //var dia = "0" + dia.toString()
   //};
   //var mes =dt.getMonth()+1;
   //if(dt.getMonth()<10) {
   //var mes = "0" + mes.toString()
   //};
    var params = {
        workspace_id: wsid,
        filter: '(request_timestamp >= ' + dtn + ', request_timestamp <= ' + dtnFinal + ')', //dt.getFullYear().toString() + '-' + mes + '-' + dia,
        page_limit:500,
        sort:"request_timestamp"
    };

    conversationLog(params).then(function(linhas){
        fs.writeFile("./views/extract/export.csv", linhas, function(err) {
            if(err) {
                console.log(err);
            } else {
                var pathAbsolute = path.resolve('./views/extract/export.csv');
                res.send('http://localhost:3001/extract/export.csv');
            }
        });
    }).catch(function(e){
        console.log(e);
    });

});


function conversationLog(params){
    var username = process.env.CONVERSATION_USER
    var password = process.env.CONVERSATION_PASS
    var assistant = new watson({
        username: username,
        password: password,
        version: '2018-02-16'
    });

    return new Promise(function(accept, reject){
        assistant.listLogs(params, function(err, response) {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                var json = response.logs
                var linha = "";
                var linhaArray = new Array(0);
                linha = "Data" + ";" + "Mensagem" + ";" + "Intenção" + ";" + "Confianca"+ ";" + "Entidades"+ ";" + "Resposta" + "\r";
                for(var i=0; json.length > i; i++){
                    var log = json[i].response.input.text;
                    if(log == 'reset'){
                        continue;
                    }
                    var log = json[i].response.input.text
                    var time = new Date(json[i].request_timestamp).toLocaleString();
                    var intencao;
                    var confianca;
                    if (json[i].response.intents.length > 0){
                        intencao = json[i].response.intents[0].intent;
                        confianca = JSON.stringify(json[i].response.intents[0].confidence);
                    }
                    var entidades = "";
                    for(var x=0; json[i].response.entities.length > x; x++){
                        entidades += json[i].response.entities[x].entity + ' : '+ json[i].response.entities[x].value + ', ';
                    }
                    var resp = JSON.stringify(json[i].response.output.text);
                    //linhaArray.push(time + ";" + intencao + ";" + confianca+ ";" + entidades+ ";" + resp + "\r")
                    // var linha = linhaArray.concat()
                    linha = linha + time + ";" + log  + ";" + intencao + ";" + confianca+ ";" + entidades+ ";" + resp + "\r"

                }
                accept(linha);
            }
        });
    });
}


var port = process.env.PORT || 3001
app.listen(port, function ()
{
    console.log('servidor on na porta: ' + port);
});
