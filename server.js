// express framework
const express = require('express')
const app = express()

// twitter framework
const Twitter = require('twitter')

// bodyParser framework
const bodyParser = require('body-parser')
app.use(bodyParser())

// set port
const PORT = process.env.PORT

// Twitter API Token expires in a few week
var tw = new Twitter({
    consumer_key: 'QbOQ5en66W0L3Xsn3yRWV0jgX',
    consumer_secret: '2XuqN3ovPM6ElRdJTLS0NzkbeDaOLvhXh78WfkjkhWju21nOey',
    access_token_key: '1213440265093935104-8mw2NyscLcs43tHXkvv5t6ZtWpugoT',
    access_token_secret: '9rnC5JhWR7KTEcjRQVyfmISREBs4Mjw9OJp3FClzmtaZi'
})

// Recent search 
let searchHistory = []
let searchName = []


// POST method
// POST는 결과만 반환 로그는 반환 안함
app.post("/", function (req, res) {
    const name = req.body.data
    function getTweets(callback) {
        tw.get('statuses/user_timeline', { screen_name: name, count: 200, tweet_mode: 'extended' }, function (error, tweets, response) {
            // Maximum count :200
            // All tweet image URL -> extended tweet_mode: 'extended'
            // Default count : 20
            switch (response.statusCode) {
                // 서버 정상 응답
                case 200:
                    if (Object.keys(tweets).length > 0) {
                        callback(tweets, null)
                    } else {
                        callback(null, 'No tweet')
                    }
                    break
                // 보호된 계정
                case 401:
                    callback(null, 'Authorization')
                    break
                // 존재하지 않는 계정
                case 404:
                    callback(null, 'Page does not exist')
                    break
                // 다른 오류의 경우 에러 호출
                default:
                    callback(null, 'Undefined Error')
                    break
            }
        })
    }

    getTweets(function (data, error) {
        // Tweet 이 존재하는 유저
        if (data !== null && Object.keys(data).length > 0) {
            /* 검색 기록 */
            // 효율성 없을까
            if (searchName.indexOf(data[0].user.screen_name) === -1) {
                searchHistory.unshift([data[0]])
                searchName.unshift(data[0].user.screen_name)
            }
            /* 검색 기록 */

            /* 유저 정보*/
            const userInfo = {
                profileImg: data[0].user.profile_image_url ? data[0].user.profile_image_url.replace('normal', '200x200') : "https://abs.twimg.com/sticky/default_profile_images/default_profile_200x200.png",
                profileDesc: {
                    name: data[0].user.name,
                    screen_name: data[0].user.screen_name,
                    description: data[0].user.description.length > 80 ? `${data[0].user.description.slice(0, 80)}...` :
                        data[0].user.description.length === 0 ? '' : data[0].user.description,
                    following: data[0].user.friends_count,
                    follower: data[0].user.followers_count,
                    verified: data[0].user.verified
                }
            }
            /* 유저 정보*/

            /* 이미지 */
            // 200개의 트윗을 가져옴
            // 동영상 썸네일 가져오면 안됨 정규식
            const re = /video/
            // 이미지가 1개인 경우, 여러개인 경우
            var userResultImage = []
            for (var i in data) {
                // 이미지가 여러개인 경우
                if (data[i].extended_entities && data[i].extended_entities.media) {
                    for (var j in data[i].extended_entities.media) {
                        // 동영상 썸네일 제거
                        if (!re.test(data[i].extended_entities.media[j].media_url)) {
                            userResultImage.push(data[i].extended_entities.media[j].media_url)
                        }
                    }
                }
                // 이미지가 한 개인 경우
                else if (
                    data[i].entities.media &&
                    data[i].entities.media[0].media_url &&
                    !data[i].entities.extended_entities
                ) {
                    if (!re.test(data[i].entities.media[0].media_url)) {
                        userResultImage.push(data[i].entities.media[0].media_url)
                    }
                }

            }
            /* 이미지*/

            /* 동영상 */
            let userResultVideo = []
            let videoIdx = 0
            let videoURL = ''
            let videoThumbnail = ''
            for (let i = 0; i < data.length; i++) {
                // 이미지 or 비디오 존재
                // 동영상 트윗은 미디어[0] 만 존재
                if (data[i].extended_entities) {
                    // 비디오가 존재하는 경우
                    if (data[i].extended_entities.media[0].video_info) {
                        // 썸네일 저장
                        videoThumbnail = data[i].extended_entities.media[0].media_url
                        // bitrate max 가져오기
                        let max = -1
                        // bitrate 0 인 variant length 1 때문에
                        for (let l = 0; l < data[i].extended_entities.media[0].video_info.variants.length; l++) {
                            if (data[i].extended_entities.media[0].video_info.variants[l].content_type === 'video/mp4') {
                                if (max < data[i].extended_entities.media[0].video_info.variants[l].bitrate) {
                                    max = data[i].extended_entities.media[0].video_info.variants[l].bitrate
                                    videoIdx = l
                                }
                                // videoURL 순서는 중요
                                videoURL = data[i].extended_entities.media[0].video_info.variants[videoIdx].url
                            }
                        }
                        userResultVideo.push([videoThumbnail, videoURL])
                    }
                }
            }
            /* 동영상 */

            /* 데이터 전송 */
            res.setHeader('Content-Type', 'application/json')
            res.send(JSON.stringify({
                data: {
                    statusCode: 200,
                    userInfo: userInfo,
                    userResult: {
                        userResultImage: userResultImage,
                        userResultVideo: userResultVideo
                    }
                }
            }))
            /* 데이터 전송 */
        }
        // 이하 error 핸들
        else if (data === null) {
            switch (error) {
                case 'Authorization':
                    res.setHeader('Content-Type', 'application/json')
                    res.send(JSON.stringify({
                        data: {
                            statusCode: 401
                        }
                    }))
                    break
                case 'Page does not exist':
                    res.setHeader('Content-Type', 'application/json')
                    res.send(JSON.stringify({
                        data: {
                            statusCode: 404
                        }
                    }))
                    break
                case 'No tweet':
                    res.setHeader('Content-Type', 'application/json')
                    res.send(JSON.stringify({
                        data: {
                            statusCode: 999
                        }
                    }))
                    break
                // Undefined Error, 이외의 케이스
                default:
                    res.setHeader('Content-Type', 'application/json')
                    res.send('error')
                    break
            }
        }
    }
    )
}
)

// GET methond - 결국 get으로 들어와도 POST와 같은 내용을 수행해야함
// GET 은 로그 + 결과를 반환
app.get("/", function (req, res) {
    // 루트 접근
    if (Object.keys(req.query).indexOf('q') === -1) {
        res.setHeader('Content-Type', 'application/json')
        res.send(JSON.stringify({ data: searchName }))
    }
    // 쿼리 존재
    else {
        // 쿼리 정상 여부 
        let isQuery = false
        // req.query 항상 존재 - 클라이언트 쿼리 존재여부
        if (Object.keys(req.query).indexOf('q') !== -1) {
            // req.query.q가 들어오면 객체화
            req.query.q = JSON.parse(req.query.q)
            // 유효한 쿼리 검증 - req.query.q가 존재할때 data가 있는경우
            if (Object.keys(req.query.q).indexOf('data') !== -1) {
                // 유효한 쿼리 3  data의 값이 히스토리에 있는경우
                if (searchName.indexOf(req.query.q.data) !== -1) {
                    isQuery = true
                    // 검증 성공 이하 로직 반환
                    const name = req.query.q.data
                    function getTweets(callback) {
                        tw.get('statuses/user_timeline', { screen_name: name, count: 200, tweet_mode: 'extended' }, function (error, tweets, response) {
                            // Maximum count :200
                            // All tweet image URL -> extended tweet_mode: 'extended'
                            // Default count : 20
                            switch (response.statusCode) {
                                // 서버 정상 응답
                                case 200:
                                    if (Object.keys(tweets).length > 0) {
                                        callback(tweets, null)
                                    } else {
                                        callback(null, 'No tweet')
                                    }
                                    break
                                // 보호된 계정
                                case 401:
                                    callback(null, 'Authorization')
                                    break
                                // 존재하지 않는 계정
                                case 404:
                                    callback(null, 'Page does not exist')
                                    break
                                // 다른 오류의 경우 에러 호출
                                default:
                                    callback(null, 'Undefined Error')
                                    break
                            }
                        })
                    }

                    getTweets(function (data, error) {
                        // Tweet 이 존재하는 유저
                        if (data !== null && Object.keys(data).length > 0) {
                            /* 검색 기록 */
                            if (searchName.indexOf(data[0].user.screen_name) === -1) {
                                searchHistory.unshift([data[0]])
                                searchName.unshift(data[0].user.screen_name)
                            }
                            /* 검색 기록 */

                            /* 유저 정보*/
                            const userInfo = {
                                profileImg: data[0].user.profile_image_url ? data[0].user.profile_image_url.replace('normal', '200x200') : "https://abs.twimg.com/sticky/default_profile_images/default_profile_200x200.png",
                                profileDesc: {
                                    name: data[0].user.name,
                                    screen_name: data[0].user.screen_name,
                                    description: data[0].user.description.length > 80 ? `${data[0].user.description.slice(0, 80)}...` :
                                        data[0].user.description.length === 0 ? '' : data[0].user.description,
                                    following: data[0].user.friends_count,
                                    follower: data[0].user.followers_count,
                                    verified: data[0].user.verified
                                }
                            }
                            /* 유저 정보*/

                            /* 이미지 */
                            // 200개의 트윗을 가져옴
                            // 동영상 썸네일 가져오면 안됨
                            const re = /video/

                            // 이미지가 1개인 경우, 여러개인 경우
                            var userResultImage = []
                            for (var i in data) {
                                // 이미지가 여러개인 경우
                                if (data[i].extended_entities && data[i].extended_entities.media) {
                                    for (var j in data[i].extended_entities.media) {
                                        // 동영상 썸네일 제거
                                        if (!re.test(data[i].extended_entities.media[j].media_url)) {
                                            userResultImage.push(data[i].extended_entities.media[j].media_url)
                                        }
                                    }
                                }
                                // 이미지가 한 개인 경우
                                else if (
                                    data[i].entities.media &&
                                    data[i].entities.media[0].media_url &&
                                    !data[i].entities.extended_entities
                                ) {
                                    if (!re.test(data[i].entities.media[0].media_url)) {
                                        userResultImage.push(data[i].entities.media[0].media_url)
                                    }
                                }

                            }
                            /* 이미지 */

                            /* 동영상 */
                            let userResultVideo = []
                            let videoIdx = 0
                            let videoURL = ''
                            let videoThumbnail = ''
                            for (let i = 0; i < data.length; i++) {
                                // 이미지 or 비디오 존재
                                // 동영상 트윗은 미디어[0] 만 존재
                                if (data[i].extended_entities) {
                                    // 비디오가 존재하는 경우
                                    if (data[i].extended_entities.media[0].video_info) {
                                        // 썸네일 저장
                                        videoThumbnail = data[i].extended_entities.media[0].media_url
                                        // bitrate max 가져오기
                                        let max = -1
                                        // bitrate 0 인 variant length 1 때문에
                                        for (let l = 0; l < data[i].extended_entities.media[0].video_info.variants.length; l++) {
                                            if (data[i].extended_entities.media[0].video_info.variants[l].content_type === 'video/mp4') {
                                                if (max < data[i].extended_entities.media[0].video_info.variants[l].bitrate) {
                                                    max = data[i].extended_entities.media[0].video_info.variants[l].bitrate
                                                    videoIdx = l
                                                }

                                                videoURL = data[i].extended_entities.media[0].video_info.variants[videoIdx].url
                                                // videoURL 순서는 중요
                                            }
                                        }
                                        userResultVideo.push([videoThumbnail, videoURL])
                                    }
                                }
                            }
                            /* 동영상 */

                            /* 데이터 전송 */
                            res.setHeader('Content-Type', 'application/json')
                            res.send(JSON.stringify({
                                data: {
                                    statusCode: 200,
                                    userInfo: userInfo,
                                    userResult: {
                                        userResultImage: userResultImage,
                                        userResultVideo: userResultVideo
                                    }
                                }
                            }))
                            /* 데이터 전송 */
                        }
                        // 이하 error 핸들
                        else if (data === null) {
                            switch (error) {
                                case 'Authorization':
                                    res.setHeader('Content-Type', 'application/json')
                                    res.send(JSON.stringify({
                                        data: {
                                            statusCode: 401
                                        }
                                    }))
                                    break
                                case 'Page does not exist':
                                    res.setHeader('Content-Type', 'application/json')
                                    res.send(JSON.stringify({
                                        data: {
                                            statusCode: 404
                                        }
                                    }))
                                    break
                                case 'No tweet':
                                    res.setHeader('Content-Type', 'application/json')
                                    res.send(JSON.stringify({
                                        data: {
                                            statusCode: 999
                                        }
                                    }))
                                    break
                                // Undefined Error, 이외의 케이스
                                default:
                                    res.setHeader('Content-Type', 'application/json')
                                    res.send('error')
                                    break
                            }
                        }
                    }
                    )
                }
            }
        }
        // 유효한 쿼리 없이 접근시 반환
        if (!isQuery) {
            res.setHeader('Content-Type', 'application/json')
            res.send('error')
        }
    }
}
)

//search logs
console.log(searchHistory)

// App listening
app.listen(PORT, function () {
    console.log(`Server is listening on Port ${PORT}`)
})