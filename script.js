var hostname;
var isLoaded = false;
var isError = false;

//if (!localStorage.getItem("extensionLoaded")) {
console.log('Running extension...');
runExtension();
//}

/** chrome.tabs.onUpdated.addListener(async function (id, changeInfo, tab) {
    if (tab.url && changeInfo.status === 'complete') {
        localStorage.setItem("extensionLoaded", true);
    }
});
*/

function runExtension() {
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        var tab = tabs[0];
        console.log('Running on ' + tab.url);
        //if (tab.url && tab.status === "complete") {
        hostname = new URL(tab.url).hostname;

        var supported, hardDomain = false;
        var cookie_domain, cookie_uuid;
        if (hostname == 'www.reeds.com' || hostname == 'www.biglots.com') {
            cookie_domain = '__rutmb';
            cookie_uuid = '__ruid';
            supported = true;
        } else if (hostname == 'www.petco.com' || hostname == 'www.dsw.com') {
            cookie_domain = '__rutmb';
            cookie_uuid = '__rutma';
            supported = true;
        } else if (hostname == 'www.sitecore.com') {
            cookie_domain = '159871551';
            cookie_uuid = '__ruid';
            supported = true;
            hardDomain = true;
        } else {
            displayError('Unsupported domain: ' + hostname);
            supported = false;
        }

        if (supported) {
            console.log('Getting site details for ' + hostname);
            const uuid = await getCookie(tab.url, cookie_uuid);
            if (hardDomain) {
                getUserProfile(cookie_domain, uuid);
            } else {
                const domain = await getCookie(tab.url, cookie_domain);
                await getUserProfile(domain, uuid);
            }
            //localStorage.setItem("extensionLoaded", true);
        }
        //  }
    });
}

function getCookie(tab_url, name) {
    console.log('Getting cookie for ' + name);
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            chrome.cookies.get({ url: tab_url, name: name }, function (cookie) {
                if (cookie) {
                    resolve(cookie.value);
                }
            });
        }, 1000)
    })
}

async function getUserProfile(domain, uuid) {
    console.log('Getting user profile for ' + uuid);
    var requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            domain_hash: domain,
            id: uuid,
            id_type: 'uuid',
            request: {
                product: [
                    "views",
                    "orders",
                    "a2c"
                ],
                category: [
                    "views",
                    "orders",
                    "a2c"
                ],
                affinity: [],
                max_size: 5,
                product_spec_version: "v2"
            }
        })
    };

    fetch('https://data-user-profile.prod.rfksrv.com/user-profile/v3/' + domain, requestOptions)
        .then((response) => response.json())
        .then((data) => {
            isLoaded = true;
            isError = false;
            buildTable(data);
            console.log(data);
            document.getElementById("loader").style = "display:none";
            document.getElementById("loading").style = "display:none";
            document.getElementById("scorecard").style = "display:block";
        })
        .catch((err) => {
            isLoaded = false;
            isError = true;
            displayError(err.message);
        });
}

function buildTable(data) {
    console.log('Building table...');
    if (data) {
        document.getElementById("hostname").innerHTML = hostname;
        document.getElementById("uuid").innerHTML = data.id;

        var affinities = Object.entries(data.affinity);
        if (affinities.length > 0) {
            const tbl = document.createElement("table");
            tbl.setAttribute("id", "affinityTable");
            const tblBody = document.createElement("tbody");
            for (var i = 0; i < affinities.length; i++) {
                var affinity = affinities[i];
                if (affinity[1] != null && affinity[1].length > 0) {
                    var name = affinity[0];
                    var affinityValues = [];

                    const nameRow = document.createElement("tr");
                    nameRow.setAttribute("class", "nameRow");
                    const nameCell = document.createElement("td");
                    nameCell.setAttribute("colspan", "2");
                    nameCell.setAttribute("class", "nameCell");
                    const nameText = document.createTextNode(name);

                    nameCell.appendChild(nameText);
                    nameRow.appendChild(nameCell);
                    tblBody.appendChild(nameRow);

                    var values = affinity[1];
                    values = values.sort((a, b) => b.score - a.score);
                    var numValues = 5;
                    if (values.length < numValues) {
                        numValues = values.length;
                    }
                    for (var v = 0; v < numValues; v++) {
                        var val = values[v].value;
                        var score = Number(values[v].score).toFixed(3);

                        const valRow = document.createElement("tr");
                        valRow.setAttribute("class", "valRow");
                        const valCell = document.createElement("td");
                        if (score >= .5) {
                            valCell.setAttribute("class", "valCell high");
                        } else {
                            valCell.setAttribute("class", "valCell");
                        }
                        const valText = document.createTextNode(val);
                        valCell.appendChild(valText);
                        valRow.appendChild(valCell);

                        const scoreCell = document.createElement("td");
                        if (score >= .5) {
                            scoreCell.setAttribute("class", "scoreCell high");
                        } else {
                            scoreCell.setAttribute("class", "scoreCell");
                        }
                        const scoreText = document.createTextNode(score);
                        scoreCell.appendChild(scoreText);
                        valRow.appendChild(scoreCell);

                        tblBody.appendChild(valRow);

                        affinityValues[v] = { val, score };
                    }
                } else {
                    //document.getElementById("message").style = "display:block";
                    //document.getElementById("message").innerHTML = "No affinities collected";
                }
            }
            tbl.appendChild(tblBody);
            const divAffinities = document.getElementById("affinities");
            divAffinities.appendChild(tbl);
        } else {
            // document.getElementById("message").style = "display:block";
            // document.getElementById("message").innerHTML = "No affinities collected";
        }

        if (data.product.views) {
            if (data.product.views.length && data.product.views.length > 0) {
                var views = data.product.views;
                var values = views.sort((a, b) => b.n - a.n);
                var top = Object.entries(values['0']);

                var topVal, topViews;
                top.map(function (values) {
                    if (values[0] == 'id') {
                        topVal = values[1];
                    }
                    if (values[0] == 'n') {
                        topViews = values[1];
                    }
                });

                const tbl = document.createElement("table");
                tbl.setAttribute("class", "infoTable");
                const tblBody = document.createElement("tbody");

                const row = document.createElement("tr");
                row.setAttribute("class", "infoRow");

                const cell1 = document.createElement("td");
                cell1.setAttribute("class", "infoCellOne");
                const text1 = document.createTextNode("Top SKU (views):");
                cell1.appendChild(text1);
                row.appendChild(cell1);

                const cell2 = document.createElement("td");
                cell2.setAttribute("class", "infoCellTwo");
                const a = document.createElement('a');
                const text2 = document.createTextNode(topVal + ' (' + topViews + ')');
                a.appendChild(text2);
                a.title = 'Open ' + topVal;
                a.href = "http://www.sitecore.com";
                cell2.appendChild(a);

                row.appendChild(cell2);
                tblBody.appendChild(row);

                tbl.appendChild(tblBody);
                const container = document.getElementById("product");
                container.appendChild(tbl);
            }
        }

        if (data.category.views) {
            if (data.category.views.length && data.category.views.length > 0) {
                var views = data.category.views;
                var values = views.sort((a, b) => b.n - a.n);
                var top = Object.entries(values['0']);

                var topVal, topViews;
                top.map(function (values) {
                    if (values[0] == 'cid') {
                        topVal = values[1];
                    }
                    if (values[0] == 'n') {
                        topViews = values[1];
                    }
                });

                const tbl = document.createElement("table");
                tbl.setAttribute("class", "infoTable");
                const tblBody = document.createElement("tbody");

                const row = document.createElement("tr");
                row.setAttribute("class", "infoRow");

                const cell1 = document.createElement("td");
                cell1.setAttribute("class", "infoCellOne");
                const text1 = document.createTextNode("Top Category (views):");
                cell1.appendChild(text1);
                row.appendChild(cell1);

                const cell2 = document.createElement("td");
                cell2.setAttribute("class", "infoCellTwo");
                const a = document.createElement('a');
                const text2 = document.createTextNode(topVal + ' (' + topViews + ')');
                a.appendChild(text2);
                a.title = 'Open ' + topVal;
                a.href = "http://www.sitecore.com";
                cell2.appendChild(a);

                row.appendChild(cell2);
                tblBody.appendChild(row);

                tbl.appendChild(tblBody);
                const container = document.getElementById("category");
                container.appendChild(tbl);
            }
        }
    }
    console.log('Affinity Scorecard loaded.');
}

function displayError(errorMessage) {
    document.getElementById("loader").style = "display:none";
    document.getElementById("spinner").style = "display:none";
    document.getElementById("loading").style = "display:none";
    document.getElementById("message").style = "display:none";
    document.getElementById("scorecard").style = "display:none";
    document.getElementById("error").style = "display:flex";
    document.getElementById("error").innerHTML = errorMessage;
    console.log(errorMessage);
}