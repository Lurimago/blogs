const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');

// Models
const { Post } = require('../models/post.model');
const { User } = require('../models/user.model');
const { Comment } = require('../models/comment.model');
const { PostImg } = require('../models/postImg.model');

// Utils
const { catchAsync } = require('../utils/catchAsync.util');
const { storage } = require('../utils/firebase.util');

const getAllPosts = catchAsync(async (req, res, next) => {
	const posts = await Post.findAll({
		where: { status: 'active' },
		attributes: ['id', 'title', 'content', 'createdAt'],
		include: [
			{ model: User, attributes: ['id', 'name'] },
			{
				model: Comment,
				required: false, // Apply OUTER JOIN
				where: { status: 'active' },
				attributes: ['id', 'comment', 'status', 'createdAt'],
			},
			{
				model: PostImg,
			},
		],
	});

	const imgRef = ref(storage, posts[0].postImgs[0].imgUrl);

	const imgUrl = await getDownloadURL(imgRef);

	res.status(200).json({
		status: 'success',
		data: { posts, imgUrl },
	});
});

const createPost = catchAsync(async (req, res, next) => {
	const { title, content } = req.body;
	const { sessionUser } = req;

	const newPost = await Post.create({
		title,
		content,
		userId: sessionUser.id,
	});

	// Create firebase reference
	const [originalName, ext] = req.file.originalname.split('.'); // -> [pug, jpg]

	const filename = `posts/${newPost.id}/${originalName}-${Date.now()}.${ext}`;
	const imgRef = ref(storage, filename);

	// Upload image to Firebase
	const result = await uploadBytes(imgRef, req.file.buffer);

	await PostImg.create({
		postId: newPost.id,
		imgUrl: result.metadata.fullPath,
	});

	res.status(201).json({
		status: 'success',
		data: { newPost },
	});
});

const updatePost = catchAsync(async (req, res, next) => {
	const { title, content } = req.body;
	const { post } = req;

	await post.update({ title, content });

	res.status(200).json({
		status: 'success',
		data: { post },
	});
});

const deletePost = catchAsync(async (req, res, next) => {
	const { post } = req;

	await post.update({ status: 'deleted' });

	res.status(200).json({
		status: 'success',
	});
});

module.exports = {
	getAllPosts,
	createPost,
	updatePost,
	deletePost,
};