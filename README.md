# Cloud Gaming Delay Classification

Using a cloud gaming service with high latency would harm the interaction of the user with the game, leading to a decrease in playing performance and, thus players frustrations. However, the negative effect of delay on gaming QoE depends strongly on the game content. At a certain level of delay, a slow-paced card game is typically not as delay sensitive as a shooting game. For optimal resource allocation and quality estimation, it is highly important for cloud providers, game developers, and network planners to consider the impact of the game content. This expert evaluation methodology contributes to a better understanding of the delay impact on QoE for cloud gaming applications by identifying game characteristics influencing the delay perception of the users.


Using this expert evaluation methodology you can quantify cloud games based on their delay sensitivity.

There are 9 characteristics that need to be evaluated!

These 9 characteristics are presented in the following link:

[Questionnaire Instruction
](https://sssabet.github.io/Delay_Classification/)



Furthermore, the repo consists of the methodology for quantifying new games, which you can demonstrate it with 30 sample video games in [study demonstration](https://sssabet.github.io/Delay_Classification/study) page. 
You can edit the script to classifiy new games do the following steps:
1. Add videos of the game in the Game folder.
2. In the study.html file, add the number of new games that you want to evaluate
'var nGames = "";'
3. Update the condition plan for the randomization of the test participants.
4. Run the study.html



The repository also contains the dataset and some parts of the data that we used for the evaluation of the model.






For reading more about the classification please read:

Saeed Shafiee Sabet, Steven Schmidt, Saman Zadtootaghaj, Carsten Griwodz, and Sebastian Möller. 2020. Delay sensitivity classification of cloud gaming content. In Proceedings of the 12th ACM International Workshop on Immersive Mixed and Virtual Environment Systems (MMVE '20). Association for Computing Machinery, New York, NY, USA, 25–30. https://doi.org/10.1145/3386293.3397116

https://dl.acm.org/doi/abs/10.1145/3386293.3397116
https://arxiv.org/pdf/2004.05609
